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

    // Fetch user by email [Delete]
    // app.get("/users/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };

    //   try {
    //     const user = await Users.findOne(query);
    //     const student = await Students.findOne(query);
    //     const teacher = await Teachers.findOne(query);

    //     if (user) {
    //       res.send({ role: user.role });
    //     } else if (student) {
    //       res.send({ role: student.role, status: student.status });
    //     } else if (teacher) {
    //       res.send({
    //         name: teacher.Name,
    //         email: teacher.Email,
    //         number: teacher.Number,
    //         subject: teacher.Subject,
    //         role: teacher.role,
    //         status: teacher.status,
    //         schedule: teacher.schedule,
    //         classTeachers: teacher.schedule.map(
    //           (scheduleItem) => scheduleItem.classTeacher
    //         ),
    //       });
    //     } else {
    //       res.status(404).send({ message: "User not found" });
    //     }
    //   } catch (error) {
    //     console.error("Error fetching user role:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // Fetch user by id [Delete]
    // app.get("/users/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };

    //   try {
    //     const user = await Users.findOne(query);
    //     const student = await Students.findOne(query);
    //     const teacher = await Teachers.findOne(query);

    //     if (user) {
    //       res.send({ role: user.role });
    //     } else if (student) {
    //       res.send({ role: student.role, status: student.status });
    //     } else if (teacher) {
    //       res.send({
    //         name: teacher.Name,
    //         email: teacher.Email,
    //         number: teacher.Number,
    //         subject: teacher.Subject,
    //         role: teacher.role,
    //         status: teacher.status,
    //         schedule: teacher.schedule,
    //         classTeachers: teacher.schedule.map(
    //           (scheduleItem) => scheduleItem.classTeacher
    //         ),
    //       });
    //     } else {
    //       res.status(404).send({ message: "User not found" });
    //     }
    //   } catch (error) {
    //     console.error("Error fetching user role:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // Get Users [Delete]
    // app.get("/users", verifyToken, async (req, res) => {
    //   const result = await Users.find().toArray();
    //   res.send(result);
    // });

    //For Front End

    //For Students [Delete]
    // app.get("/students", verifyToken, async (req, res) => {
    //   const { status, class: className } = req.query;

    //   try {
    //     let query = {};
    //     if (status) {
    //       query.status = status;
    //     }
    //     if (className) {
    //       query.Class = className;
    //     }

    //     const students = await Students.find(query).toArray();
    //     res.send(students);
    //   } catch (error) {
    //     console.error("Error fetching students:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // PATCH API to update status, performance and attendance
    // without teacher info
    // app.patch("/student/:id", verifyToken, async (req, res) => {
    //   const { id } = req.params;
    //   const { status, feedback, mark, attendanceStatus } = req.body;

    //   try {
    //     const updateFields = {};
    //     if (status) {
    //       updateFields.$set = { status };
    //     }
    //     if (feedback && mark) {
    //       updateFields.$push = {
    //         performance: { feedback, mark },
    //       };
    //     }
    //     if (attendanceStatus) {
    //       const attendanceEntry = {
    //         date: new Date(),
    //         status: attendanceStatus,
    //       };

    //       if (updateFields.$push) {
    //         updateFields.$push.attendance = attendanceEntry;
    //       } else {
    //         updateFields.$push = {
    //           attendance: attendanceEntry,
    //         };
    //       }
    //     }

    //     if (!updateFields.$set) {
    //       updateFields.$set = {};
    //     }

    //     const result = await Students.updateOne(
    //       { _id: new ObjectId(id) },
    //       updateFields
    //     );

    //     if (result.modifiedCount === 0) {
    //       return res.status(404).send({ message: "Student not found" });
    //     }

    //     res.send({ message: "Student updated successfully" });
    //   } catch (error) {
    //     console.error("Error updating student:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // [Delete]
    // app.get("/student/:id", verifyToken, async (req, res) => {
    //   const { id } = req.params;

    //   try {
    //     const student = await Students.findOne({ _id: new ObjectId(id) });

    //     if (!student) {
    //       return res.status(404).send({ message: "Student not found" });
    //     }

    //     res.send(student);
    //   } catch (error) {
    //     console.error("Error retrieving student:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // Nishi
    app.patch("/student/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status, feedback, mark, attendanceStatus, teacherSubject } =
        req.body;

      console.log(status);

      try {
        const updateFields = {
          $set: {},
          $push: {},
        };

        if (status) {
          updateFields.$set.status = status;
        }
        if ((feedback || mark) && !teacherSubject) {
          return res
            .status(400)
            .send({ message: "Teacher subject is required for feedback." });
        }

        if (feedback || mark) {
          updateFields.$set[`performance.${teacherSubject}`] = {
            feedback,
            mark,
            date: new Date(),
          };
        }
        if (attendanceStatus) {
          const attendanceEntry = {
            date: new Date(),
            status: attendanceStatus,
          };
          updateFields.$push.attendance = attendanceEntry;
        }
        if (Object.keys(updateFields.$set).length === 0) {
          delete updateFields.$set;
        }
        if (Object.keys(updateFields.$push).length === 0) {
          delete updateFields.$push;
        }

        const result = await Students.updateOne(
          { _id: new ObjectId(id) },
          updateFields
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Student not found" });
        }

        res.send({ message: "Student updated successfully" });
      } catch (error) {
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

    // Delete this  [Nishi...]
    app.get("/student/:id", async (req, res) => {
      const { id } = req.params;

      try {
        // Validate the ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid student ID format" });
        }

        // Fetch student data from the database
        const student = await Students.findOne({ _id: new ObjectId(id) });

        if (!student) {
          return res.status(404).send({ message: "Student not found" });
        }

        // Return the student data
        res.send(student);
      } catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ----------------------------------------------------------
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

    //For Admin

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close(); // আপনি চাইলে মোগো সংযোগটি বন্ধ করতে এখানে একটি কোড যোগ করতে পারেন
  }
}

run().catch(console.error);
