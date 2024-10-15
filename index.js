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
    const Fees = database.collection("Fees");
    const Notices = database.collection("Notices");
    const Events = database.collection("Events");
    const ClassRoutine = database.collection("ClassRoutine");

    // info
    const Info = database.collection("Info");

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
        // সকল শিক্ষার্থীর ডেটা বের করা
        const students = await Students.find({}).toArray();

        // প্রতিটি শিক্ষার্থীর ডেটাতে নতুন fees ফিল্ড যোগ করা
        // for (const student of students) {
        //   await Students.updateOne(
        //     { _id: student._id },
        //     { $set: { fees: [] } } // fees ফিল্ড যোগ করা, যেটি একটি খালি অ্যারে
        //   );
        // }

        res.send({ message: "Fees field added to all students successfully!" });
      } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    app.patch("/addFees", verifyToken, async (req, res) => {
      const query = req.body;
      console.log(query);

      try {
        const students = await Students.find({ Class: query.class }).toArray();
        // প্রতিটি শিক্ষার্থীর fees অ্যারেতে নতুন কুইরি পুশ করা
        for (const student of students) {
          await Students.updateOne(
            { _id: student._id },
            { $push: { fees: query } } // fees ফিল্ডে নতুন কুইরি পুশ করা হচ্ছে
          );
        }
        // for (const student of students) {
        //   await Students.updateOne(
        //     { _id: student._id },
        //     { $pull: { fees: query } } // fees ফিল্ড থেকে নির্দিষ্ট কুইরি রিমুভ করা হচ্ছে
        //   );
        // }

        // প্রতিটি শিক্ষার্থীর ডেটাতে নতুন fees ফিল্ড যোগ করা
        // for (const student of students) {
        //   await Students.updateOne(
        //     { _id: student._id },
        //     { $set: { fees: [] } } // fees ফিল্ড যোগ করা, যেটি একটি খালি অ্যারে
        //   );
        // }

        res.status(200).send({
          message: "Query added to all students in Class 1 successfully!",
        });
      } catch (error) {
        console.error("Error updating attendance:", error.message);
        res.status(500).send({ message: "Server error" });
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
        const todayDate = new Date().toISOString().slice(0, 10);

        let lastObject = null;

        if (student.attendance?.length > 0) {
          lastObject = student.attendance[student.attendance?.length - 1];

          if (
            new Date(lastObject.date).toISOString().slice(0, 10) === todayDate
          ) {
            lastObject.status = attendanceStatus;
            await Students.updateOne(
              { _id: new ObjectId(id) },
              { $set: { attendance: student.attendance } }
            );
            return res
              .status(200)
              .send({ message: "Attendance updated successfully!" });
          }
        }

        // নতুন attendance যোগ করা
        student.attendance.push({
          date: new Date(),
          status: attendanceStatus,
        });

        await Students.updateOne(
          { _id: new ObjectId(id) },
          { $set: { attendance: student.attendance } }
        );

        return res
          .status(200)
          .send({ message: "New attendance added successfully!" });
      } catch (error) {
        console.error("Error updating attendance:", error.message);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Result Api Nishi
    app.patch("/result/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { result, teacherSubject } = req.body;

      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });

        const updateFields = {
          $set: {},
          $push: {},
        };

        // Remove this
        if (!student.results) {
          student.results = {};
        }

        if (!student.results[teacherSubject]) {
          student.results[teacherSubject] = [];
        }

        const resultEntry = {
          result: result,
          date: new Date(),
        };

        updateFields.$push[`results.${teacherSubject}`] = resultEntry;

        const resultUpdate = await Students.updateOne(
          { _id: new ObjectId(id) },
          updateFields
        );

        if (resultUpdate.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "No changes made", resultUpdate });
        }

        res.send({
          message: "Results updated successfully",
          results: resultUpdate,
        });
      } catch (error) {
        console.error("Error updating results:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    // Performance Api Nishi
    app.patch("/performance/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { performanceData, teacherSubject } = req.body;

      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });
        // for first time performance add[remove this]
        console.log(student);
        if (!student.performance) {
          student.performance = {};
        }

        if (!student.performance[teacherSubject]) {
          student.performance[teacherSubject] = [];
        }

        student.performance[teacherSubject].push({
          feedback: performanceData.feedback,
          mark: performanceData.mark,
          date: new Date(),
        });
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

    // Status update Api
    app.patch("/student/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });

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

    // Get student by email [Nishi for getting student in Fees Management]
    app.get("/student/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const student = await Students.findOne({ Email: email });

        if (student) {
          res.send(student);
        } else {
          res.status(404).send({ message: "Student not found" });
        }
      } catch (error) {
        console.error("Error retrieving student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // update student profile
    app.patch("/update-student/:email", async (req, res) => {
      const { email } = req.params;
      const formdata = req.body;
      console.log("formdata", formdata);

      try {
        const existingStudent = await Students.findOne({ Email: email });

        if (!existingStudent) {
          return res.status(404).json({ msg: "student not found" });
        }

        if (existingStudent) {
          const data = await Students.findOneAndUpdate(
            { Email: email },
            {
              $set: formdata,
            },
            { returnDocument: "after" }
          );

          res.status(200).send({
            message: "Student updated successfully",
            student: data,
          });
        }
      } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).send({ message: "Internal Server Error", error });
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

    //For Teachers (used in Home and All-Teacher Route)
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
    app.patch("/teacher/:id", verifyToken, async (req, res) => {
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

    // edit info
    app.post("/edit-info", async (req, res) => {
      const formData = req.body;

      try {
        // get existing data
        const existingData = await Info.find({}).toArray();

        if (existingData.length < 1) {
          const data = await Info.insertOne(formData);

          res.status(200).json({ msg: "success", data: data });
        } else if (existingData.length > 0) {
          const data = await Info.updateOne(
            { _id: existingData[0]._id },
            { $set: formData }
          );

          res.status(200).json({ msg: "success", data: data });
        }
      } catch (error) {
        res.status(500).json({ msg: "error", error: error });
      }
    });
    // get info
    app.get("/get-info", async (req, res) => {
      try {
        // get existing data
        const existingData = await Info.find({}).toArray();

        res.status(200).json({ msg: "success", data: existingData[0] });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error: error });
      }
    });
    // create new notice
    app.post("/notices/create", verifyToken, async (req, res) => {
      const { type, title, details } = req.body;
      console.log(req.body);
      if (!type || !title || !details) {
        return res.status(406).json({ msg: "failed", msg: "missing fields" });
      }

      try {
        const data = await Notices.insertOne({
          ...req.body,
          type,
          title,
          details,
          createdAt: new Date(),
        });

        res.status(201).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });

    // get all notice
    app.get("/notices", async (req, res) => {
      try {
        const data = await Notices.find({}).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "failed", error });
      }
    });

    // create event
    app.post("/events/create", async (req, res) => {
      const { date, time, title, details, image } = req.body;

      if (!date || !time || !title || !details || !image) {
        return res.status(406).json({ msg: "failed", msg: "missing fields" });
      }

      try {
        const data = await Events.insertOne({
          ...req.body,
          createdAt: new Date(),
        });

        res.status(201).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });

    // get events
    app.get("/events", async (req, res) => {
      try {
        const data = await Events.find({}).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "failed", error });
      }
    });

    // update class routine
    app.post("/class-routine", async (req, res) => {
      const formData = req.body;

      try {
        // get existing data
        const existingData = await ClassRoutine.find({}).toArray();

        if (existingData.length < 1) {
          const data = await ClassRoutine.insertOne({
            name: "class-routine",
            data: formData,
          });

          res.status(200).json({ msg: "success", data: data });
        } else if (existingData.length > 0) {
          const data = await ClassRoutine.findOneAndUpdate(
            { _id: existingData[0]._id },
            {
              $set: {
                data: formData,
              },
            },
            { returnDocument: "after" }
          );

          res.status(200).json({ msg: "success", data });
        }
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // get info
    app.get("/class-routine", async (req, res) => {
      try {
        // get existing data
        const existingData = await ClassRoutine.find({}).toArray();

        res.status(200).json({ msg: "success", data: existingData[0] });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error: error });
      }
    });

    // ---------------------------------
    // payment api [Nishi]
    // app.post("/fees", verifyToken, async (req, res) => {
    //   const {
    //     paymentMethod,
    //     transactionId,
    //     transactionNumber,
    //     paymentDate,
    //     discount,
    //     studentId,
    //   } = req.body;
    //   const status = "pending";

    // payment api [Nishi]
    app.post("/fees", verifyToken, async (req, res) => {
      const {
        paymentMethod,
        transactionId,
        transactionNumber,
        paymentDate,
        discount,
        studentId,
      } = req.body;
      const status = "pending";

      try {
        const newFee = {
          paymentMethod,
          transactionId,
          transactionNumber,
          paymentDate,
          discount,
          studentId,
          status,
        };

        const result = await Fees.insertOne(newFee);
        res.status(201).send({ message: "Fee submitted successfully", result });
      } catch (error) {
        console.error("Error submitting fee:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // get all fees [Nishi]
    app.get("/fees", verifyToken, async (req, res) => {
      try {
        const fees = await Fees.find({}).toArray();
        res.status(200).send(fees);
      } catch (error) {
        console.error("Error fetching fees:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // update fee status [Nishi]
    app.patch("/fee/:id", verifyToken, async (req, res) => {
      const feeId = req.params.id;
      const { status } = req.body;

      try {
        const updatedFee = await Fees.updateOne(
          { _id: new ObjectId(feeId) },
          { $set: { status: status } }
        );
        res.status(200).send({ message: `Fee status updated to ${status}` });
      } catch (error) {
        console.error("Error updating fee status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close(); // আপনি চাইলে মোগো সংযোগটি বন্ধ করতে এখানে একটি কোড যোগ করতে পারেন
  }
}

run().catch(console.error);
