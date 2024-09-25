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
      const query = { email: user.Email };
      const existingUser = await Users.findOne(query);
      const existingStudents = await Students.findOne(query);
      const existingTeachers = await Teachers.findOne(query);
      if ((existingUser, existingStudents, existingTeachers)) {
        return res.send({
          message: "user already exists",
          insertedId: null,
        });
      } else if (user.role === "Teacher") {
        user.status = "pending";
        const result = await Teachers.insertOne(user);
        res.send(result);
      } else if (user.role === "Student") {
        user.status = "pending";
        const result = await Students.insertOne(user);
        res.send(result);
      }
      if (user.role === "User") {
        const result = await Users.insertOne(user);
        res.send(result);
      }
    });

    // Fetch user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { Email: email };

      try {
        const user = await Users.findOne(query);
        const student = await Students.findOne(query);
        const teacher = await Teachers.findOne(query);

        if (user) {
          res.send({ role: user.role });
        } else if (student) {
          res.send({ role: student.role, status: student.status });
        } else if (teacher) {
          res.send({
            name: teacher.Name,
            email: teacher.Email,
            number: teacher.Number,
            subject: teacher.Subject,
            role: teacher.role,
            status: teacher.status,
            schedule: teacher.schedule,
            classTeachers: teacher.schedule.map(
              (scheduleItem) => scheduleItem.classTeacher
            ),
          });
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // For update teacher info
    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;

      const transformedData = {
        Name: updatedData.name,
        Email: updatedData.email,
        Number: updatedData.number,
        Subject: updatedData.subject,
        role: updatedData.role,
        status: updatedData.status,
        schedule: updatedData.schedule,
        classTeachers: updatedData.classTeachers,
      };

      try {
        const updatedUser = await Teachers.findOneAndUpdate(
          { Email: email },
          { $set: transformedData },
          { new: true, upsert: true }
        );

        if (updatedUser) {
          res.send(updatedUser);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/users", async (req, res) => {
      const result = await Users.find().toArray();
      res.send(result);
    });

    //For Front End

    //For Students
    app.get("/students", async (req, res) => {
      const { status, class: className } = req.query;

      try {
        let query = {};
        if (status) {
          query.status = status;
        }
        if (className) {
          query.Class = className;
        }

        const students = await Students.find(query).toArray();
        res.send(students);
      } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Update Student status , performance and rating
    app.patch("/students/:id", async (req, res) => {
      const { id } = req.params;
      const { status, feedback, performance } = req.body;

      try {
        const updateFields = {};
        if (status) updateFields.status = status;
        if (feedback) updateFields.feedback = feedback;
        if (performance) updateFields.performance = performance;

        const result = await Students.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Student not found" });
        }

        res.send({ message: "Student updated successfully" });
      } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Delete a student's data
    app.delete("/students/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await Students.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Student not found" });
        }

        res.send({ message: "Student deleted successfully" });
      } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //For Teachers
    app.get("/teachers", async (req, res) => {
      const { status } = req.query;

      try {
        let query = {};
        if (status) {
          query = { status: status };
        }
        const teachers = await Teachers.find(query).toArray();
        res.send(teachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Update teacher status & Schedule
    app.patch("/teachers/:id", async (req, res) => {
      const { id } = req.params;
      const { status, classSchedule } = req.body;
      try {
        const updateFields = {};
        if (status) updateFields.status = status;
        if (classSchedule) updateFields.schedule = classSchedule;
        const result = await Teachers.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Teacher not found" });
        }

        res.send({ message: "Teacher updated successfully" });
      } catch (error) {
        console.error("Error updating teacher:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // delete teacher
    app.delete("/teachers/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await Teachers.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Teacher not found" });
        }

        res.send({ message: "Teacher deleted successfully" });
      } catch (error) {
        console.error("Error deleting teacher:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //For Admin

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close(); // আপনি চাইলে মোগো সংযোগটি বন্ধ করতে এখানে একটি কোড যোগ করতে পারেন
  }
}

run().catch(console.error);
