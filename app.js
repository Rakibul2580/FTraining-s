const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASSWORD}@cluster0.cmog9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

async function run() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const database = client.db("Orvido-School");
    const Users = database.collection("Users");
    const Students = database.collection("Students");
    const Teachers = database.collection("Teachers");

    app.get("/", async (req, res) => {
      res.send("hello world");
    });

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // middlewares
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

    // For New Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await Users.findOne(query);
      if (existingUser) {
        return res.send({
          message: "user already exists",
          insertedId: null,
        });
      }
      const result = await Users.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await Users.find().toArray();
      res.send(result);
    });

    //For Front End

    //For Students

    //For Teachers

    //For Admin

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close(); // আপনি চাইলে মোগো সংযোগটি বন্ধ করতে এখানে একটি কোড যোগ করতে পারেন
  }
}

run().catch(console.error);
