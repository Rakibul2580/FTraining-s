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
    const Contacts = database.collection("Contact");
    const Members = database.collection("Member");
    const Transition = database.collection("Transition");

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
        //     { $set: { "performance.total": 1 } } // fees ফিল্ড যোগ করা, যেটি একটি খালি অ্যারে
        //   );
        // }
        const x = 200;
        const y = x - (x * 2) / 100;

        res.send({
          y,
          message: "Fees field added to all students successfully!",
        });
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
          const studentFeesData = { ...feesData };

          if (!student?.discount) {
            await Students.updateOne(
              { _id: student._id },
              { $push: { fees: studentFeesData } }
            );
          } else {
            studentFeesData.amount =
              studentFeesData.amount -
              (studentFeesData.amount * Number(student?.discount)) / 100;
            studentFeesData.discount = student.discount;

            await Students.updateOne(
              { _id: student._id },
              { $push: { fees: studentFeesData } }
            );
          }
          console.log(studentFeesData);
        }
        delete feesData.status;
        feesData.date = new Date().toISOString().slice(0, 10);
        feesData.class = formClass;
        await AllFees.insertOne(feesData);
        res.status(200).json({ message: "Fees added successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add fees" });
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

    // Performance Api
    // used for update feedback, mark. used in MyStudents.jsx & AssignedStudents.jsx in Teacher Dashboard
    app.patch("/performance/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { performance } = req.body;

      try {
        // Ensure the student exists
        const student = await Students.findOne({ _id: new ObjectId(id) });
        const studentMark = Number(student?.performance?.mark) || 0;
        const newMark = Number(performance?.mark) || 0;
        const total = student?.performance?.total || 0;

        // মার্ক যোগ করা
        performance.mark = studentMark + newMark;
        performance.total = total + 1;

        const performanceUpdate = await Students.updateOne(
          { _id: new ObjectId(id) },
          { $set: { performance: performance } }
        );

        if (performanceUpdate.modifiedCount === 0) {
          return res.status(204).send();
        }

        const updatedStudent = await Students.findOne({
          _id: new ObjectId(id),
        });
        res.send(updatedStudent.performance);
      } catch (error) {
        console.error("Error updating performance:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    // Status update Api
    // update status of student and set classRoll used in MyStudent page of teacher dashboard
    app.patch("/student/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { status, classRoll } = req.body;
      try {
        const student = await Students.findOne({ _id: new ObjectId(id) });

        const updateFields = {
          $set: {},
        };
        if (status) {
          updateFields.$set.status = status;
        }
        if (classRoll) {
          updateFields.$set.classRoll = classRoll;
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

    app.patch("/student/discount/:email", verifyToken, async (req, res) => {
      const data = req.body;
      try {
        const student = await Students.findOne({ Email: data.email });
        if (!student) {
          return res.send({ message: "Student Id is Incorrect" });
        }
        if (data.type === "Temporary") {
          const feeData = student.fees.find(
            (fee) => fee.randomNumber === data.randomNumber
          );
          if (!feeData) {
            return res.send({ message: "Random Number is Incorrect" });
          }

          feeData.amount = feeData.amount - data.amount;
          feeData.discount = data.amount;

          const result = await Students.updateOne(
            {
              Email: data.email,
              "fees.randomNumber": data.randomNumber,
            },
            {
              $set: {
                "fees.$.amount": feeData.amount,
                "fees.$.discount": feeData.discount,
              },
            }
          );
          res.send({
            message: "Discount applied successfully",
            updatedFee: result,
          });
        } else {
          const result = await Students.updateOne(
            { Email: data.email },
            {
              $set: {
                discount: data.amount,
              },
            }
          );
          console.log(result, data.amount);
          res.send({
            message: "Permanent Discount applied successfully",
            updatedFee: result,
          });
        }
      } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    app.get("/discount", verifyToken, async (req, res) => {
      try {
        const permanent = await Students.find({
          discount: { $exists: true },
        }).toArray();
        const temporary = await Students.find({
          "fees.discount": { $exists: true },
        }).toArray();
        res.status(200).send({ temporary, permanent });
      } catch (error) {
        console.error("Error retrieving students:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    const { ObjectId } = require("mongodb");

    app.delete("/student/discount/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await Students.updateOne(
          { _id: new ObjectId(id) },
          { $unset: { discount: "" } }
        );

        if (result.modifiedCount > 0) {
          res
            .status(200)
            .send({ message: "Discount key deleted successfully" });
        } else {
          res
            .status(404)
            .send({ message: "Student not found or no discount key" });
        }
      } catch (error) {
        console.error("Error deleting discount key:", error);
        res.status(500).send({ message: "Internal Server Error" });
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
    app.get("/students/:class", async (req, res) => {
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

    // get results from student (saroar)
    // used in "/Dashboard/Result"
    app.get(
      "/students/get-results/:studentId/:classe/:subject",
      verifyToken,
      async (req, res) => {
        const { classe, subject, studentId } = req.params;

        try {
          const data = await Students.find({
            _id: new ObjectId(studentId),
            Class: classe,
          })
            .sort({ _id: -1 })
            .toArray();

          const thisSubjectResults = data
            .flatMap((item) => item.results || [])
            .filter((result) => result.subject === subject);

          res.status(200).json({ msg: "success", data: thisSubjectResults });
        } catch (error) {
          console.log("error", error);
          res.status(500).json({ msg: "error", error });
        }
      }
    );

    // update existing results
    // used in "/Dashboard/Result"
    app.put(
      "/students/update-result/:studentId/:classe/:subject/:title",
      async (req, res) => {
        const { result } = req.body; // New result value
        const { classe, subject, title, studentId } = req.params;

        try {
          const updatedStudent = await Students.updateOne(
            {
              _id: new ObjectId(studentId),
              Class: classe.toString(),
            },
            {
              $set: {
                "results.$[elem].result": result,
              },
            },
            {
              arrayFilters: [{ "elem.subject": subject, "elem.title": title }],
            }
          );

          if (updatedStudent.modifiedCount === 0) {
            return res
              .status(406)
              .json({ msg: "No matching student or result found" });
          }

          res.status(200).json({ msg: "Result updated successfully" });
        } catch (error) {
          console.error("Error updating result:", error);
          res.status(500).json({ msg: "Error updating result", error });
        }
      }
    );

    // update student class
    // used in "/Dashboard/Result"
    app.patch("/students/update-class/:studentId", async (req, res) => {
      const { Class } = req.body;
      const { studentId } = req.params;

      try {
        const updatedStudent = await Students.updateOne(
          {
            _id: new ObjectId(studentId),
          },
          {
            $set: {
              Class: Class.toString(),
            },
          }
        );

        if (updatedStudent.modifiedCount === 0) {
          return res
            .status(404)
            .json({ msg: "No matching student or result found" });
        }

        res.status(200).json({ msg: "Class updated successfully" });
      } catch (error) {
        console.error("Error updating result:", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    // push a result to the student model (Saroar)
    // used in "Dashboard/Result"
    // app.patch("/student/new-result/:id", verifyToken, async (req, res) => {
    //   const { id } = req.params;

    //   const formdata = req.body;

    //   try {
    //     const data = await Students.updateOne(
    //       { _id: new ObjectId(id) },
    //       {
    //         $push: {
    //           results: {
    //             title: formdata.title,
    //             result: formdata.result,
    //             subject: formdata.subject,
    //           },
    //         },
    //       }
    //     );

    //     res.status(200).json({ msg: "success", data });
    //   } catch (error) {
    //     console.error("Error updating student:", error);
    //     res.status(500).json({ message: "Internal Server Error", error });
    //   }
    // });

    // push a result to the student model (Saroar)
    // used in "Dashboard/Result"
    app.patch("/student/new-result/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const formdata = req.body;

      try {
        const data = await Students.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              results: {
                title: formdata.title,
                result: formdata.result,
                subject: formdata.subject,
              },
            },
          }
        );

        if (data.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Student not found or no changes made" });
        }

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Internal Server Error", error });
      }
    });

    // update student profile by email
    app.patch("/update-student/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const formdata = req.body;

      try {
        const result = await Students.findOneAndUpdate(
          { Email: email },
          { $set: formdata },
          { returnDocument: "after" }
        );

        res.status(200).json({ msg: "success", data: result });
      } catch (error) {
        console.error("Error updating student data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // update homework to all student (Saroar)
    // used in "dashboard/AssignedStudents"
    app.post("/student/assign-homework", async (req, res) => {
      const { selectedClass, selectedSubject, homeWork } = req.body;

      console.log("Received Data:", req.body);

      try {
        // Update homework for all students in the specified class
        const updatedStudents = await Students.updateMany(
          { Class: String(selectedClass) }, // Ensure the field matches the `Class` type in DB
          {
            $set: {
              [`homeworks.${selectedSubject}`]: homeWork,
            },
          },
          { returnDocument: "after" } // Optional: to retrieve updated documents
        );

        if (updatedStudents.modifiedCount > 0) {
          res
            .status(200)
            .json({ msg: "Homework updated successfully!", updatedStudents });
        } else {
          res
            .status(404)
            .json({ msg: "No students found for the specified class." });
        }
      } catch (error) {
        console.error("Error updating homework:", error);
        res.status(500).json({ message: "Internal Server Error", error });
      }
    });

    // get previous homework (Saroar)
    // used in "dashboard/AssignedStudents"
    app.get("/student/get-homework/:subject/:Class", async (req, res) => {
      const { subject, Class } = req.params;

      try {
        const data = await Students.find(
          {
            Class: String(Class),
            [`homeworks.${subject}`]: { $exists: true },
          },
          { [`homeworks.${subject}`]: 1, _id: 0 }
        ).toArray();

        const homeworkNames = data.map((student) => student.homeworks[subject]);

        res.status(200).json({ msg: "success", data: homeworkNames[0] });
      } catch (error) {
        console.error("Error fetching student homework:", error);
        res.status(500).json({ message: "Internal Server Error", error });
      }
    });

    // update student class and result (Saroar)
    // used in "Dashboard/UpdateResult"
    app.patch("/student/update-class-result/:id", async (req, res) => {
      const { Class, classRole, Section } = req.body;
      const newClass = parseInt(Class) + 1;
      const { id } = req.params;
      console.log("newClass", newClass);
      console.log("id", id);

      try {
        const data = await Students.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              Class: newClass.toString(),
              classRoll: classRole.toString(),
              Section: Section,
            },
          }
        );

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.error("Error", error);
        res.status(500).json({ message: "Internal Server Error", error });
      }
    });

    //get Teachers
    // (used in Home.jsx and All-Teacher.jsx Route)
    app.get("/teachers", async (req, res) => {
      try {
        let query = {};
        const teachers = await Teachers.find(query).toArray();
        res.send(teachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/home/teachers", async (req, res) => {
      try {
        let query = {};
        const teachers = await Teachers.find(query, {
          projection: {
            Name: 1,
            img: 1,
            classSchedule: 1,
            role: 1,
            mySpeech: 1,
          },
        }).toArray();
        res.send(teachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/home/teacher/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };

      try {
        const teacher = await Teachers.findOne(query, {
          projection: {
            Name: 1,
            Number: 1,
            Email: 1,
            img: 1,
            classSchedule: 1,
            role: 1,
            mySpeech: 1,
            currSalary: 1,
            joiningDate: 1,
          },
        });
        res.send(teacher);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.patch("/teacher/Attendance/:id", async (req, res) => {
      const { id } = req.params; // টিচার আইডি
      const { check } = req.query; // Check-in বা Check-out
      try {
        const teacher = await Teachers.findOne({ _id: new ObjectId(id) });

        const lastIndex = teacher.attendance.length - 1;
        const date = new Date(); // বর্তমান তারিখ
        if (check === "out") {
          const day = date.getDay(); // সপ্তাহের দিন সংখ্যা বের করুন

          if (day === 4) {
            const fridayAttendance = {
              check: "Friday",
              in: date,
              out: "",
            };
            const Friday = await Teachers.updateOne(
              { _id: new ObjectId(id) },
              { $push: { attendance: fridayAttendance } } // অ্যারেতে নতুন অবজেক্ট যোগ করুন
            );
            const updatedTeacher = await Teachers.updateOne(
              { _id: new ObjectId(id) },
              {
                $set: {
                  [`attendance.${lastIndex}.check`]: "out", // চেক আউট হিসেবে চিহ্নিত করা
                  [`attendance.${lastIndex}.out`]: date, // চেক আউট সময় সংযুক্ত করা
                },
              }
            );
          } else {
            const updatedTeacher = await Teachers.updateOne(
              { _id: new ObjectId(id) },
              {
                $set: {
                  [`attendance.${lastIndex}.check`]: "out", // চেক আউট হিসেবে চিহ্নিত করা
                  [`attendance.${lastIndex}.out`]: date, // চেক আউট সময় সংযুক্ত করা
                },
              }
            );
          }

          res.status(200).send({
            message: "Last attendance updated to check-out successfully!",
          });
        } else {
          const newAttendance = {
            check: "in",
            in: date,
            out: "",
          };
          if (
            teacher?.attendance[lastIndex]?.in?.toISOString()?.slice(0, 10) ===
            date.toISOString().slice(0, 10)
          ) {
            return res
              .status(500)
              .send({ message: "Already Today Attendance Done" });
          } else {
            const updatedTeacher = await Teachers.updateOne(
              { _id: new ObjectId(id) },
              { $push: { attendance: newAttendance } } // অ্যারেতে নতুন অবজেক্ট যোগ করুন
            );
          }

          res
            .status(200)
            .send({ message: "New check-in entry added successfully!" });
        }
      } catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Update teacher status & Schedule
    // For updating teachers status (accepted/rejected), for set class scheduel.used in Teacher.jsx component of admin dashboard
    app.patch("/teacher/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { joiningDate, currSalary, role, classSchedule, status } = req.body;

      try {
        const updatedTeacher = await Teachers.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...req.body,
            },
          },
          { returnDocument: "after" }
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

    // Update teacher status & Schedule
    // For updating teachers data
    app.patch("/admin-update-teacher/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { currSalary, joiningDate, role } = req.body;

      try {
        const updatedTeacher = await Teachers.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $set: {
              currSalary,
              joiningDate,
              role,
            },
          },
          { returnDocument: "after" }
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

    // Update teacher by email
    app.patch("/update-teacher/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const formdata = req.body;

      try {
        const result = await Teachers.findOneAndUpdate(
          { Email: email },
          { $set: formdata },
          { returnDocument: "after" }
        );

        res.status(200).json({ msg: "success", data: result });
      } catch (error) {
        console.error("Error updating teacher data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Get teacher by email
    // used in "/Dashboard/TeacherProfile/MyProfile"
    // used in Result.jsx page of Teacher Dashboard , MyStudents.jsx, AssignedStudents.jsx
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

    // app.get("/teacher/:id", async (req, res) => {
    //   const { id } = req.params;
    //   console.log("Fetching teacher by ID:", id);

    //   try {
    //     const result = await Teachers.findOne({ _id: new ObjectId(id) });

    //     if (result) {
    //       res.status(200).json(result);
    //     } else {
    //       res.status(404).json({ message: "Teacher not found" });
    //     }
    //   } catch (error) {
    //     console.error("Error fetching teacher data:", error);
    //     res.status(500).json({ message: "Internal Server Error" });
    //   }
    // });

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

    // add teacher feedback (Saroar)
    // used in "/Dashboard/Student/My-Profile"
    app.patch("/teacher-feedback/create", verifyToken, async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Teachers.findOneAndUpdate(
          { Name: formdata.givenTo },
          {
            $push: {
              feedbacks: formdata,
            },
          },
          { returnDocument: "after" }
        );

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ msg: "Internal Server Error" });
      }
    });

    // find teachers feedbacks by currUser (Saroar)
    // used in "/Dashboard/Student/My-Profile"
    app.get("/get-feedbacks", verifyToken, async (req, res) => {
      const { email } = req.query;

      try {
        const data = await Teachers.aggregate([
          {
            $match: {
              "feedbacks.createdBy": email,
            },
          },
          {
            $project: {
              feedbacks: {
                $filter: {
                  input: "$feedbacks",
                  as: "feedback",
                  cond: { $eq: ["$$feedback.createdBy", email] },
                },
              },
            },
          },
          { $unwind: "$feedbacks" }, // Flatten each feedback object
          {
            $group: {
              _id: null,
              feedbacks: { $push: "$feedbacks" }, // Combine all into a single array
            },
          },
          { $project: { _id: 0, feedbacks: 1 } }, // Only return the feedbacks array
        ]).toArray();

        const allFeedbacks = data.flatMap((doc) => doc.feedbacks);

        res.status(200).json({ msg: "success", data: allFeedbacks });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ msg: "Internal Server Error" });
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

    // get number info

    app.get("/count-info", async (req, res) => {
      try {
        // শিক্ষকদের মোট সংখ্যা
        const teacherCount = await Teachers.countDocuments({});
        // শিক্ষার্থীদের মোট সংখ্যা
        const studentCount = await Students.countDocuments({});

        // প্রতিটি ক্লাসের শিক্ষার্থীর সংখ্যা
        const studentCountByClass = await Students.aggregate([
          {
            $group: {
              _id: "$Class", // ক্লাস অনুযায়ী গ্রুপিং
              count: { $sum: 1 }, // প্রতিটি ক্লাসের শিক্ষার্থীর সংখ্যা যোগ করা
            },
          },
          {
            $sort: { _id: 1 }, // ক্লাসের নাম অনুযায়ী সাজানো
          },
        ]).toArray();

        res.status(200).json({
          msg: "success",
          teacherCount, // শিক্ষকের সংখ্যা
          studentCount, // শিক্ষার্থীর সংখ্যা
          studentCountByClass, // ক্লাস অনুযায়ী শিক্ষার্থীর সংখ্যা
        });
      } catch (error) {
        console.error("Error fetching count info:", error);
        // যদি কোনো সমস্যা হয়
        res.status(500).json({ msg: "error", error });
      }
    });

    // create new notice
    app.post("/notices/create", verifyToken, async (req, res) => {
      const { type, title, details, createdBy } = req.body;
      if (!type || !title || !details || !createdBy) {
        return res.status(406).json({ msg: "failed", msg: "missing fields" });
      }

      try {
        const data = await Notices.insertOne({
          ...req.body,
          type,
          title,
          details,
          createdBy,
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

    // get notices by email, used in Notices page for displaying all notices published by any teacher.
    app.get("/notices/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      try {
        const data = await Notices.find({ createdBy: email })
          .sort({ _id: -1 })
          .toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });
    // For delete one notice. used in Notice page
    app.delete("/notice/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      try {
        const result = await Notices.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ msg: "failed", error: "Notice not found" });
        }

        res.status(200).json({ msg: "success", data: { id } });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });

    // create event
    app.post("/events/create", async (req, res) => {
      const { date, time, title, details, image, createdBy } = req.body;

      if (!date || !time || !title || !details || !image || !createdBy) {
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

    // get events created by saroar
    // user in "Dashboard/Others" and 'homepage', dont protect it, its public
    app.get("/events", async (req, res) => {
      try {
        const data = await Events.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "failed", error });
      }
    });

    // get events by email, used in Events page for displaying all events published by any teacher.
    app.get("/events/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      try {
        const data = await Events.find({ createdBy: email })
          .sort({ _id: -1 })
          .toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });

    // for Normal users
    app.get("/eventById/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Events.findOne({ _id: new ObjectId(id) });

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        console.log("error", error);
        res.status(500).json({ msg: "failed", error });
      }
    });

    // For delete one event. used in Event page
    app.delete("/event/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      try {
        const result = await Events.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ msg: "failed", error: "Notice not found" });
        }

        res.status(200).json({ msg: "success", data: { id } });
      } catch (error) {
        console.log("error", error);
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
        const existingData = await Info.find({}).toArray();

        const income = existingData[0].Income || 0;
        const updatedExpense = Number(income) + Number(data.payAmount); // যোগ করুন
        await Info.updateOne(
          { _id: existingData[0]._id },
          { $set: { Income: updatedExpense } }
        );

        const student = await Students.findOne(
          (_id = new ObjectId(data.studentId))
        );
        const feeIndex = student.fees.findIndex(
          (fee) => fee.randomNumber === data.randomNumber
        );
        // if student amount or student payAmount dose not match
        if (student.fees[feeIndex].amount !== data.payAmount) {
          student.fees[feeIndex].status = "again Pending";
          student.fees[feeIndex].amount =
            Number(student.fees[feeIndex].amount) - Number(data.payAmount);

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
        res.status(200).send({ message: `Fee status updated to ${status}` });
      } catch (error) {
        console.error("Error updating fee status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // [Nishi]
    // Api for post an Application, used in Application.jsx page of Teacher Dashboard..
    app.post("/application", verifyToken, async (req, res) => {
      const data = req.body;
      data.status = "pending";
      data.currStatus = "notOpened";

      try {
        const result = await Application.insertOne(data);
        res
          .status(201)
          .send({ message: "Application submitted successfully", result });
      } catch (error) {
        console.error("Error submitting application:", error);
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
    app.get("/applications/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { activeTab } = req.query;
      try {
        if (activeTab === "received") {
          const applications = await Application.find({ fromId: id }).toArray();
          res.status(200).send(applications);
        } else if (activeTab === "send") {
          const applications = await Application.find({ toId: id }).toArray();
          res.status(200).send(applications);
        } else {
          res.status(400).send({ message: "Invalid tab selection" });
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // update the currStatus.
    app.patch("/set-open-application/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      try {
        await Application.updateOne(
          { _id: new ObjectId(id) },
          { $set: { currStatus: "opened" } }
        );

        res.status(200).send({ message: `Application status updated` });
      } catch (error) {
        console.error("Error updating application status:", error);
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
        res.status(500).json({ msg: "error", error });
      }
    });

    //For Normal Users
    app.get("/get-newsById/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const data = await Newss.findOne({ _id: new ObjectId(id) });

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // get all news (Saroar)
    // used in "homepage" route. NB: dont protect this route, its public
    app.get("/get-news", async (req, res) => {
      try {
        const data = await Newss.find({}).sort({ _id: -1 }).toArray();

        res.status(200).json({ msg: "success", data });
      } catch (error) {
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
        const data = await ParentTestimonials.find(
          email ? { createdBy: email } : {}
        )
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

    // create contacts (Saroar)
    // used in "/Contact"
    app.post("/contact/create", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Contacts.insertOne({
          ...formdata,
          createdAt: new Date(),
          status: "Pending",
        });
        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // get contacts (Saroar)
    // used in "/Contact"
    app.get("/contact/all", async (req, res) => {
      try {
        const data = await Contacts.find({}).sort({ _id: -1 }).toArray();
        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // mark contac as replied or not (Saroar)
    // used in "/Contact"
    app.patch("/contact/change-status", async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Contacts.updateOne(
          {
            _id: new ObjectId(formdata.id),
          },
          {
            $set: {
              status: formdata.status,
            },
          }
        );

        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // add new member
    // used in "/Dashboard/AddMembers"
    app.post("/add-new-member", verifyToken, async (req, res) => {
      const formdata = req.body;

      try {
        const data = await Members.insertOne({
          ...formdata,
        });
        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // get all members
    // used in "/Dashboard/AddMembers"
    app.get("/get-all-members", async (req, res) => {
      try {
        const data = await Members.find().toArray();
        res.status(200).json({ msg: "success", data });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    // delet member
    // used in "/Dashboard/AddMembers"
    app.delete("/member-delete/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      try {
        const data = await Members.findOneAndDelete({
          _id: new ObjectId(id),
        });

        res.status(200).json({
          msg: "success",
          data,
        });
      } catch (error) {
        res.status(500).json({ msg: "error", error });
      }
    });

    app.post("/money-transition", verifyToken, async (req, res) => {
      const { data } = req.body;
      try {
        const existingData = await Info.find({}).toArray();

        if (data.dataType === "Expense") {
          const expense = existingData[0].Expense || 0;
          const updatedExpense = Number(expense) + Number(data.amount); // বিয়োগ করুন
          await Info.updateOne(
            { _id: existingData[0]._id },
            { $set: { Expense: updatedExpense } }
          );
        } else if (data.dataType === "Income") {
          const income = existingData[0].Income || 0;
          const updatedExpense = Number(income) + Number(data.amount); // যোগ করুন
          await Info.updateOne(
            { _id: existingData[0]._id },
            { $set: { Income: updatedExpense } }
          );
        }

        const insertedData = await Transition.insertOne(data);

        res.status(200).json({ msg: "success", data: insertedData });
      } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ msg: "error", error });
      }
    });

    app.get("/money-transition", verifyToken, async (req, res) => {
      try {
        const transition = await Transition.find(data).toArray();

        res.status(200).json({ msg: "success", transition });
      } catch (error) {
        console.error("Error occurred:", error);
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
