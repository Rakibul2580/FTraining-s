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

    app.get("/", async (req, res) => {
      try {
        console.log("Fetching all students");
        const result = await Teachers.find({}).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
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

    // For Students

    app.patch("/attendance/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { attendanceStatus } = req.body;
      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });
        console.log(id, student);

        const lastObject = student?.attendance[student?.attendance?.length - 1];
        // console.log(id, student, lastObject);
        const todayDate = new Date().toISOString().slice(0, 10);

        if (
          new Date(lastObject.date).toISOString().slice(0, 10) === todayDate
        ) {
          lastObject.status = attendanceStatus;
          const result = await Students.updateOne(
            { _id: new ObjectId(id) },
            { $set: { attendance: student.attendance } }
          );

          if (result.modifiedCount > 0) {
            res
              .status(200)
              .send({ message: "Attendance updated successfully!" });
          } else {
            res.status(500).send({ message: "Failed to update attendance" });
          }
        } else {
          student.attendance.push({
            date: new Date(),
            status: attendanceStatus,
          });

          const result = await Students.updateOne(
            { _id: new ObjectId(id) },
            { $set: { attendance: student.attendance } }
          );

          if (result.modifiedCount > 0) {
            res
              .status(200)
              .send({ message: "New attendance added successfully!" });
          } else {
            res.status(500).send({ message: "Failed to add new attendance" });
          }
        }
      } catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Result Api Nishi
    app.patch("/result/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { result, teacherSubject } = req.body; // Remove feedback and keep date

      try {
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid student ID" });
        }

        // Find the student first
        const student = await Students.findOne({ _id: new ObjectId(id) });
        if (!student) {
          return res.status(404).send({ message: "Student not found" });
        }

        // Prepare update fields
        const updateFields = {
          $set: {},
          $push: {},
        };

        // Initialize results object if it doesn't exist
        if (!student.results) {
          student.results = {};
        }

        // Initialize the subject if it doesn't exist
        if (!student.results[teacherSubject]) {
          student.results[teacherSubject] = [];
        }

        // Create the new result entry with date
        const resultEntry = {
          result: result,
          date: new Date(), // Add the current date
        };

        // Push the new result entry to the specific subject's results
        updateFields.$push[`results.${teacherSubject}`] = resultEntry;

        // Perform the update operation
        const resultUpdate = await Students.updateOne(
          { _id: new ObjectId(id) },
          updateFields
        );

        // Check if the update was successful
        if (resultUpdate.modifiedCount === 0) {
          return res.status(404).send({ message: "No changes made" });
        }

        // Fetch the updated student to send back in the response
        const updatedStudent = await Students.findOne({
          _id: new ObjectId(id),
        });

        // Convert the results to the desired format
        const formattedResults = {};
        for (const subject in updatedStudent.results) {
          formattedResults[subject] = updatedStudent.results[subject].map(
            (entry) => ({
              result: entry.result,
              date: entry.date, // Include date
            })
          );
        }

        // Send the response with the updated student's results
        res.send({
          message: "Results updated successfully",
          results: formattedResults,
        });
      } catch (error) {
        console.error("Error updating results:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    app.patch("/performance/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { performanceData, teacherSubject } = req.body;

      try {
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid student ID" });
        }
        const student = await Students.findOne({ _id: new ObjectId(id) });
        if (!student) {
          return res.status(404).send({ message: "Student not found" });
        }
        if (!student.performance) {
          student.performance = {};
        }
        student.performance[teacherSubject] = [
          {
            feedback: performanceData.feedback,
            mark: performanceData.mark,
            date: new Date(),
          },
        ];
        const performanceUpdate = await Students.updateOne(
          { _id: new ObjectId(id) },
          { $set: { performance: student.performance } }
        );

        if (performanceUpdate.modifiedCount === 0) {
          return res.status(204).send();
        }

        const updatedStudent = await Students.findOne({
          _id: new ObjectId(id),
        });
        const responsePerformance = {
          [teacherSubject]: updatedStudent.performance[teacherSubject],
        };

        res.send(responsePerformance);
      } catch (error) {
        console.error("Error updating performance:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });
    // Starus Api
    app.patch("/student/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid student ID" });
        }
        const student = await Students.findOne({ _id: new ObjectId(id) });
        if (!student) {
          return res.status(404).send({ message: "Student not found" });
        }

        const updateFields = {
          $set: {},
        };
        if (status) {
          updateFields.$set.status = status;
        }

        const resultUpdate = await Students.updateOne(
          { _id: new ObjectId(id) },
          updateFields
        );
        if (resultUpdate.modifiedCount === 0) {
          return res.status(204).send();
        }

        const updatedStudent = await Students.findOne({
          _id: new ObjectId(id),
        });
        res.send({
          message: "Student updated successfully",
          student: updatedStudent,
        });
      } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    // [Delete]
    app.get("/student/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });

        if (!student) {
          return res.status(404).send({ message: "Student not found" });
        }

        res.send(student);
      } catch (error) {
        console.error("Error retrieving student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Delete a student's data
    app.delete("/student/:id", verifyToken, async (req, res) => {
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

    // Get student class for the teacher Rakibul
    app.get("/students/:class", verifyToken, async (req, res) => {
      const classInfo = req.params.class;

      try {
        let query = { Class: classInfo }; // Matching field name with your database field (Class)
        const students = await Students.find(query).toArray(); // Finding students of a particular class
        res.send(students);
      } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ------------------------------------------------------------

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
    app.patch("/teacher/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const updateFields = {};

      if (updatedData.name) updateFields.Name = updatedData.name;
      if (updatedData.email) updateFields.Email = updatedData.email;
      if (updatedData.number) updateFields.Number = updatedData.number;
      if (updatedData.subject) updateFields.Subject = updatedData.subject;
      if (updatedData.role) updateFields.role = updatedData.role;
      if (updatedData.status) updateFields.status = updatedData.status;
      if (updatedData.classSchedule)
        updateFields.classSchedule = updatedData.classSchedule;

      try {
        const updatedTeacher = await Teachers.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateFields },
          { new: true, upsert: true }
        );

        if (updatedTeacher) {
          res.send(updatedTeacher);
        } else {
          res.status(404).send({ message: "Teacher not found" });
        }
      } catch (error) {
        console.error("Error updating teacher data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Get teacher by email
    app.get("/teacher/:email", async (req, res) => {
      const { email } = req.params; // ইমেইল প্যারাম থেকে নেওয়া হচ্ছে

      try {
        const teacher = await Teachers.findOne({ Email: email }); // ইমেইল দিয়ে টিচার খুঁজছি

        if (teacher) {
          res.send(teacher);
        } else {
          res.status(404).send({ message: "Teacher not found" });
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // delete teacher
    app.delete("/teacher/:id", verifyToken, async (req, res) => {
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

    // ---------------------------------

    //For Admin

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close(); // আপনি চাইলে মোগো সংযোগটি বন্ধ করতে এখানে একটি কোড যোগ করতে পারেন
  }
}

run().catch(console.error);
