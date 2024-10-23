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
    const AllFees = database.collection("AllFees");
    const Notices = database.collection("Notices");
    const Events = database.collection("Events");
    const ClassRoutine = database.collection("ClassRoutine");
    const ExamRoutine = database.collection("ExamRoutine");
    const Application = database.collection("Application");
    const Newss = database.collection("News");
    const ParentTestimonials = database.collection("ParentsTestimonial");
    const Achievements = database.collection("Achievement");
    const Gallery = database.collection("Gallery");
    const Syllabus = database.collection("Syllabus");
    const Sheets = database.collection("Sheet");
    const AcademicRules = database.collection("AcademicRule");
    const ExamSystem = database.collection("ExamSystem");

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
      const { feesData, formClass } = req.body;
      try {
        feesData.status = "Pending";
        const students = await Students.find({ Class: formClass }).toArray();
        for (const student of students) {
          await Students.updateOne(
            { _id: student._id },
            { $push: { fees: feesData } }
          );
        }

        delete feesData.status;
        feesData.date = new Date().toISOString().slice(0, 10);
        feesData.class = formClass;
        await AllFees.insertOne(feesData);

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

    app.get("/allFees", verifyToken, async (req, res) => {
      try {
        const fees = await AllFees.find({}).toArray();

        res.status(200).send({
          message: "Fees fetched successfully!",
          fees,
        });
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

    // Result Api [Nishi]
    // update Result of any student in Result.jsx in Teacher dashboard
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

    // Performance Api [Nishi]
    // used for update feedback, mark by teacher.. used in MyStudents.jsx & AssignedStudents.jsx in Teacher Dashboard
    app.patch("/performance/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { performanceData, teacherSubject } = req.body;

      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });
        // for first time performance add[remove this]
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
    // update status of student
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
        res.status(200).send(student);
      } catch (error) {
        console.error("Error retrieving student:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // used for delete a student's data from database
    // For accept and Reject one student. Used in Student.jsx of admin dashboard & MyStudents.jsx in Teacher Dashboard.

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

    //get Teachers
    // (used in Home.jsx and All-Teacher.jsx Route)
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
    // For updating teachers status (accepted/rejected), for set class scheduel.used in Teacher.jsx component of admin dashboard
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
    // used in "/Dashboard/TeacherProfile/MyProfile"
    // used in Result.jsx page of Teacher Dashboard , MyStudents.jsx, AssignedStudents.jsx
    app.get("/teacher/:email", verifyToken, async (req, res) => {
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
    // Admin can accept or delete one teacher.... used in Teacher.jsx component of admin dashboard
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
        const data = await Notices.find({}).sort({ _id: -1 }).toArray();

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

    // get routine
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

    // exam routine create and update
    app.post("/exam-routine", async (req, res) => {
      const formData = req.body;

      try {
        // get existing data
        const existingData = await ExamRoutine.find({}).toArray();

        if (existingData.length < 1) {
          const data = await ExamRoutine.insertOne({
            name: "exam-routine",
            data: formData,
          });

          res.status(200).json({ msg: "success", data });
        } else if (existingData.length > 0) {
          const data = await ExamRoutine.findOneAndUpdate(
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

    // get exam routine
    app.get("/exam-routine", async (req, res) => {
      try {
        // get existing data
        const existingData = await ExamRoutine.find({}).toArray();

        res.status(200).json({ msg: "success", data: existingData[0] });
      } catch (error) {
        res.status(500).json({ msg: "error", error: error });
      }
    });

    // payment api [Nishi]
    // students pay and add informations here.. fees with studentId... used in FeesManagement.jsx component of Student dashboard.
    app.post("/fees", verifyToken, async (req, res) => {
      const query = req.body;
      try {
        const student = await Students.findOne(
          (_id = new ObjectId(query.studentId))
        );
        const feeIndex = student.fees.findIndex(
          (fee) => fee.randomNumber === query.randomNumber
        );
        student.fees[feeIndex].status = "Processing";
        const updateStudent = await Students.updateOne(
          { _id: new ObjectId(query.studentId) },
          { $set: { fees: student.fees } }
        );
        const result = await Fees.insertOne(query);
        res.status(201).send({ message: "Fee submitted successfully", result });
      } catch (error) {
        console.error("Error submitting fee:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // get all fees [Nishi]
    // Also used in FeesManagement Page table format.
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
    // For Accept the fee Process by admin /teacher. In Finance.jsx component of Admin Dashboard
    app.patch("/fee/:id", verifyToken, async (req, res) => {
      const feeId = req.params.id;
      const { data, status } = req.body;

      try {
        const student = await Students.findOne(
          (_id = new ObjectId(data.studentId))
        );
        const feeIndex = student.fees.findIndex(
          (fee) => fee.randomNumber === data.randomNumber
        );
        // if student amount or student payAmount dose not match
        if (
          student.fees[feeIndex].amount !== student.fees[feeIndex].payAmount
        ) {
          student.fees[feeIndex].status = "again Pending";
          student.fees[feeIndex].amount =
            Number(student.fees[feeIndex].amount) -
            Number(student.fees[feeIndex].payAmount);
          const result = await Students.updateOne(
            { _id: new ObjectId(data.studentId) },
            { $set: { fees: student.fees } }
          );
          const feeResult = await Fees.updateOne(
            { _id: new ObjectId(feeId) },
            { $set: { status: "again Pending" } }
          );
          return res.status(200).send({
            message: "Fee status updated successfully",
            result,
            feeResult: result,
          });
        }

        if (feeIndex !== -1) {
          student.fees[feeIndex].status = status;
          const result = await Students.updateOne(
            { _id: new ObjectId(data.studentId) },
            { $set: { fees: student.fees } }
          );
          const feeResult = await Fees.updateOne(
            { _id: new ObjectId(feeId) },
            { $set: { status: status } }
          );
          return res.status(200).send({
            message: "Fee status updated successfully",
            result,
            feeResult: feeResult,
          });
        } else {
          return res.status(404).send({ message: "Fee record not found" });
        }
        // const result = await Students.updateOne(
        //   { _id: new ObjectId(data.studentId) },
        //   { $set: { fees: newFees } }
        // );
        // const updatedFee = await Fees.updateOne(
        //   { _id: new ObjectId(feeId) },
        //   { $set: { status: status } }
        // );
        res.status(200).send({ message: `Fee status updated to ${status}` });
      } catch (error) {
        console.error("Error updating fee status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // [Nishi]
    // Api for post an Application, used in Application.jsx page of Teacher Dashboard..
    app.post("/application", verifyToken, async (req, res) => {
      const { subject, message, teacherId, teacherName } = req.body;
      const status = "pending";

      try {
        const newApplication = {
          subject,
          message,
          teacherId,
          teacherName,
          status,
          submittedAt: new Date(),
        };

        const result = await Application.insertOne(newApplication);
        res
          .status(201)
          .send({ message: "Application submitted successfully", result });
      } catch (error) {
        console.error("Error submitting application:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // [Nishi]
    // To fetch applications on the ApplicationManagement.jsx page for the admin dashboard, but it's currently being used in the teacher dashboard as well.
    app.get("/applications", verifyToken, async (req, res) => {
      try {
        const applications = await Application.find({}).toArray();
        res.status(200).send(applications);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // PATCH API to update the status of an application, used in ApplicationManagement.jsx page of Admin dashboard.
    app.patch("/application/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const result = await Application.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: status } }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Application not found" });
        }
        res
          .status(200)
          .send({ message: `Application status updated to ${status}` });
      } catch (error) {
        console.error("Error updating application status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // get applications by teacherId for display that teacher application and used in Application.jsx page pf teacher Dashboard..
    app.get("/applications/:teacherId", verifyToken, async (req, res) => {
      const { teacherId } = req.params;
      try {
        const applications = await Application.find({ teacherId }).toArray();
        res.status(200).send(applications);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // create new news (Saroar)
    // used in "Dashboard/Others" route
    app.post("/create-news", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Newss.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
          },
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // delete a news (Saroar)
    // used in "Dashboard/Others" route
    app.delete("/delete-news/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Newss.findOneAndDelete({ _id: new ObjectId(id) });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // get all news by this user new news (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-news/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const data = await Newss.find({
          createdBy: email,
        })
          .sort({ _id: -1 })
          .toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // create new parents testimonial (Saroar)
    // used in "/Dashboard/Student/My-Profile"
    app.post("/parent-testimonial/create", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await ParentTestimonials.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
            createdAt: new Date(),
          },
        });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // get all parents testimonial (Saroar)
    // used in "/Dashboard/Student/My-Profile"
    app.get("/parent-testimonials", async (req, res) => {
      const { email } = req.query;

      try {
        const data = await ParentTestimonials.find({
          createdBy: email,
        })
          .sort({ _id: -1 })
          .toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // create new achievements (Saroar)
    // used in "/Dashboard/Others" route
    app.post("/create-achievements", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Achievements.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
          },
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // delete a achievement (Saroar)
    // used in "Dashboard/Others" route
    app.delete("/delete-achievements/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Achievements.findOneAndDelete({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // get all news by this user new news (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-achievements", async (req, res) => {
      try {
        const data = await Achievements.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // create new gallery (Saroar)
    // used in "/Dashboard/Others" route
    app.post("/create-gallery", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Gallery.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
          },
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // delete a gallery (Saroar)
    // used in "Dashboard/Others" route
    app.delete("/delete-gallery/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Gallery.findOneAndDelete({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // get all gallery (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-gallery", async (req, res) => {
      try {
        const data = await Gallery.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    // create new Syllabus (Saroar)
    // used in "/Dashboard/Others" route
    app.post("/create-syllabus", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Syllabus.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
          },
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // delete a Syllabus (Saroar)
    // used in "Dashboard/Others" route
    app.delete("/delete-syllabus/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Syllabus.findOneAndDelete({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // get all Syllabus (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-syllabus", async (req, res) => {
      try {
        const data = await Syllabus.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // create new sheet (Saroar)
    // used in "/Dashboard/Others" route
    app.post("/create-sheet", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Sheets.insertOne({
          ...formdata,
          createdAt: new Date(),
        });

        res.status(200).json({
          msg: "success",
          data: {
            _id: data.insertedId,
            ...formdata,
          },
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // delete a Syllabus (Saroar)
    // used in "Dashboard/Others" route
    app.delete("/delete-sheet/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Sheets.findOneAndDelete({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // get all Syllabus (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-sheet", async (req, res) => {
      try {
        const data = await Sheets.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);

        res.status(500).json({ msg: "error", error });
      }
    });

    // update academic rules (Saroar)
    // used in "Dashboard/Others" route
    app.post("/update-rules", async (req, res) => {
      const formData = req.body;

      try {
        const existingData = await AcademicRules.find({}).toArray();
        if (existingData.length < 1) {
          const newData = await AcademicRules.insertOne(formData);

          return res.status(200).json({ msg: "success", data: newData });
        }

        if (existingData.length > 0) {
          const newData = await AcademicRules.updateOne(
            { _id: existingData[0]._id },
            {
              $set: {
                rules: formData.rules,
              },
            }
          );

          return res.status(200).json({ msg: "success", data: newData });
        }
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    // update academic rules (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-rules", async (req, res) => {
      try {
        const data = await AcademicRules.find({}).toArray();

        return res.status(200).json({ msg: "success", data: data[0] });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    // update academic rules (Saroar)
    // used in "Dashboard/Others" route
    app.post("/update-exam-rules", async (req, res) => {
      const formData = req.body;

      try {
        const existingData = await ExamSystem.find({}).toArray();
        if (existingData.length < 1) {
          const newData = await ExamSystem.insertOne(formData);

          return res.status(200).json({ msg: "success", data: newData });
        }

        if (existingData.length > 0) {
          const newData = await ExamSystem.updateOne(
            { _id: existingData[0]._id },
            {
              $set: {
                rules: formData.rules,
              },
            }
          );

          return res.status(200).json({ msg: "success", data: newData });
        }
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    // update academic rules (Saroar)
    // used in "Dashboard/Others" route
    app.get("/get-exam-rules", async (req, res) => {
      try {
        const data = await ExamSystem.find({}).toArray();

        return res.status(200).json({ msg: "success", data: data[0] });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "error", error });
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
