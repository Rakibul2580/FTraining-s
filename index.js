const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASSWORD}@cluster0.rwu6sqx.mongodb.net/Fops-Training?retryWrites=true&w=majority`;

async function run() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    tls: true,
    tlsAllowInvalidCertificates: false,
    serverApi: {
      version: "1",
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully");

    const database = client.db("Fops-Training");
    const Users = database.collection("Users");

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(403).send({ message: "No token provided" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Invalid token" });
        }
        req.decoded = decoded;
        next();
      });
    };

    app.post("/signup", async (req, res) => {
      const { email, password, name, age, role, gender } = req.body;
      try {
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
          return res.status(400).send({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
          email,
          password: hashedPassword,
          name,
          age: parseInt(age),
          role,
          gender,
        };
        await Users.insertOne(newUser);

        if (!process.env.ACCESS_TOKEN_SECRET) {
          throw new Error("ACCESS_TOKEN_SECRET is not defined");
        }

        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "24h",
        });

        res.status(201).send({ message: "User created successfully", token });
      } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await Users.findOne({ email });
        if (!user) {
          return res.status(400).send({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).send({ message: "Invalid password" });
        }

        if (!process.env.ACCESS_TOKEN_SECRET) {
          throw new Error("ACCESS_TOKEN_SECRET is not defined");
        }

        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "24h",
        });

        res.status(200).send({ message: "Login successful", token });
      } catch (error) {
        console.error("Error in login:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post("/forgot-password", async (req, res) => {
      const { email } = req.body;
      try {
        // ইউজার খুঁজুন
        const user = await Users.findOne({ email });
        if (!user) {
          return res.status(400).send({ message: "ইউজার পাওয়া যায়নি" });
        }

        // ACCESS_TOKEN_SECRET চেক
        if (!process.env.ACCESS_TOKEN_SECRET) {
          throw new Error("ACCESS_TOKEN_SECRET is not defined");
        }

        // JWT রিসেট টোকেন তৈরি
        const resetToken = jwt.sign(
          { email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );

        // Nodemailer সেটআপ
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST, // mail.saawning.com
          port: process.env.EMAIL_PORT, // 465
          secure: true, // SSL/TLS-এর জন্য true
          auth: {
            user: process.env.EMAIL_USER, // test@saawning.com
            pass: process.env.EMAIL_PASS, // P*3JdOPkmJNr
          },
        });

        // ইমেলের বিষয়বস্তু
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "পাসওয়ার্ড রিসেট লিঙ্ক",
          // text: `আপনার পাসওয়ার্ড রিসেট করতে এই লিঙ্কে ক্লিক করুন: http://localhost:3000/reset-password?token=${resetToken}`,
          // html: `<p>আপনার পাসওয়ার্ড রিসেট করতে <a href="http://localhost:5173/reset-password?token=${resetToken}">এখানে ক্লিক করুন</a>। লিঙ্কটি ১ ঘণ্টার জন্য সক্রিয় থাকবে।</p>`,          text: `আপনার পাসওয়ার্ড রিসেট করতে এই লিঙ্কে ক্লিক করুন: http://localhost:3000/reset-password?token=${resetToken}`,

          text: `আপনার পাসওয়ার্ড রিসেট করতে এই লিঙ্কে ক্লিক করুন: https://ftraining.vercel.app/reset-password?token=${resetToken}`,
          html: `<p>আপনার পাসওয়ার্ড রিসেট করতে <a href="https://ftraining.vercel.app/reset-password?token=${resetToken}">এখানে ক্লিক করুন</a>। লিঙ্কটি ১ ঘণ্টার জন্য সক্রিয় থাকবে।</p>`,
        };

        // ইমেল পাঠান
        await transporter.sendMail(mailOptions);
        res.status(200).send({
          message: "পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেলে পাঠানো হয়েছে",
        });
      } catch (error) {
        console.error("পাসওয়ার্ড রিসেটে ত্রুটি:", error);
        res.status(500).send({ message: "ইন্টারনাল সার্ভার ত্রুটি" });
      }
    });

    app.post("/reset-password", async (req, res) => {
      const { token, newPassword } = req.body;
      try {
        // টোকেন যাচাই করুন
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const email = decoded.email;

        // ইউজার খুঁজুন
        const user = await Users.findOne({ email });
        if (!user) {
          return res.status(400).send({ message: "ইউজার পাওয়া যায়নি" });
        }

        // নতুন পাসওয়ার্ড হ্যাশ করুন
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // পাসওয়ার্ড আপডেট করুন
        await Users.updateOne(
          { email },
          { $set: { password: hashedPassword } }
        );

        res.status(200).send({ message: "পাসওয়ার্ড সফলভাবে রিসেট হয়েছে" });
      } catch (error) {
        console.error("পাসওয়ার্ড রিসেটে ত্রুটি:", error);
        res.status(400).send({ message: "টোকেন অবৈধ বা মেয়াদ শেষ" });
      }
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined");
      }
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    app.get("/", async (req, res) => {
      try {
        const x = 200;
        const y = x - (x * 2) / 100;
        res.send({
          y,
          message: "Server is running successfully!",
        });
      } catch (error) {
        console.error("Error in GET route:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

run().catch(console.error);
