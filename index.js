const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const app = express();
const port = 5000;
// CORS কনফিগারেশন
const corsOptions = {
  origin: [
    "https://ftraining-46l35h3hy-rakibul2580s-projects.vercel.app",
    "http://localhost:5173", // লোকাল ডেভেলপমেন্ট
    "https://ftraining.vercel.app", // প্রোডাকশন ফ্রন্টএন্ড
    "resturent.saawning.com", // অন্য একটি ডোমেইন
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // অ্যালাউ করা HTTP মেথড
  allowedHeaders: ["Content-Type", "Authorization"], // অ্যালাউ করা হেডার
  credentials: true, // ক্রেডেনশিয়াল (যেমন কুকি) পাঠানোর জন্য
};

// CORS মিডলওয়্যার ব্যবহার
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // OPTIONS রিকোয়েস্ট হ্যান্ডেল করুন
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
    const Slides = database.collection("slides");

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
      const { email, password, name, age, role, gender, date, status } =
        req.body;
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
          date,
          status,
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

    // লগইন ব্যবহারকারীর তথ্য পাওয়ার এন্ডপয়েন্ট
    app.get("/api/user", verifyToken, async (req, res) => {
      try {
        const email = req.decoded.email;
        const user = await Users.findOne(
          { email },
          { projection: { password: 0 } }
        ); // পাসওয়ার্ড বাদ দিয়ে
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.status(200).json({
          id: user._id,
          email: user.email,
          name: user.name,
          age: user.age,
          role: user.role,
          gender: user.gender,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
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
        const a = await Users.find({}).toArray();
        res.send({
          a,
          y,
          message: "Server is running successfully",
          Test: process.env.EMAIL_USER,
        });
      } catch (error) {
        console.error("Error in GET route:", error);
        res.status(500).send({
          message: "Internal Server Error",
        });
      }
    });

    // নতুন এন্ডপয়েন্ট: সব ব্যবহারকারী পাওয়া
    app.get("/api/users", verifyToken, async (req, res) => {
      try {
        const users = await Users.find(
          {},
          { projection: { password: 0 } }
        ).toArray();
        res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // নতুন এন্ডপয়েন্ট: স্লাইড টেক্সট পোস্ট এবং ডিলিট
    app.post("/api/slide", verifyToken, async (req, res) => {
      try {
        const { h1, h2, p, li1, li2, li3, li4, li5, div, img, category, MCQ } =
          req.body;
        const slide = {
          h1,
          h2,
          p,
          li1,
          li2,
          li3,
          li4,
          li5,
          div,
          img,
          category,
          MCQ,
          createdBy: req.decoded.email,
          createdAt: new Date(),
        };
        await Slides.insertOne(slide);
        res.status(201).send({ message: "Slide posted successfully", slide });
      } catch (error) {
        console.error("Error posting slide:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/api/slides", verifyToken, async (req, res) => {
      try {
        const slides = await Slides.find({}).toArray();
        res.status(200).json(slides);
      } catch (error) {
        console.error("Error fetching slides:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.delete("/api/slide/:id", verifyToken, async (req, res) => {
      console.log("first");
      try {
        const result = await Slides.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Slide not found" });
        }
        res.status(200).send({ message: "Slide deleted successfully" });
      } catch (error) {
        console.error("Error deleting slide:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // নতুন এন্ডপয়েন্ট: MCQ প্রশ্ন পোস্ট
    app.post("/api/mcq", verifyToken, async (req, res) => {
      try {
        const { question, options, correctAnswer } = req.body;
        console.log(req.body);
        // Create MCQ object
        const mcq = {
          question,
          options,
          correctAnswer,
          createdBy: req.decoded.email,
          createdAt: new Date(),
        };

        // Find the slide using slideIndex._id
        const result = await Slides.findOne({
          _id: new ObjectId(req.body.slideIndex._id), // Extract _id from the slideIndex object
        });

        if (!result) {
          return res.status(404).send({ message: "Slide not found" });
        }

        // Push the new MCQ into result.MCQ array
        const updatedMCQ = result.MCQ ? [...result.MCQ, mcq] : [mcq];

        // Update the slide document in the database
        await Slides.updateOne(
          { _id: new ObjectId(req.body.slideIndex._id) },
          { $set: { MCQ: updatedMCQ } }
        );
        console.log(Slides);
        // Send success response
        res.status(201).send({ message: "MCQ posted successfully", mcq });
      } catch (error) {
        console.error("Error posting MCQ:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ব্যবহারকারীর রোল পরিবর্তন
    app.put("/api/user/role/:email", verifyToken, async (req, res) => {
      try {
        const { role } = req.body;
        const result = await Users.updateOne(
          { email: req.params.email },
          { $set: { role } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }
        res.status(200).send({ message: "User role updated successfully" });
      } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // নতুন মডারেটর ব্যবহারকারী তৈরি
    app.post("/api/moderator", verifyToken, async (req, res) => {
      try {
        const { email, password, name, age, gender } = req.body;
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
          return res.status(400).send({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newModerator = {
          email,
          password: hashedPassword,
          name,
          age: parseInt(age),
          role: "moderator",
          gender,
        };
        await Users.insertOne(newModerator);
        res
          .status(201)
          .send({ message: "Moderator created successfully", newModerator });
      } catch (error) {
        console.error("Error creating moderator:", error);
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
