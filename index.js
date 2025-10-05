const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ===============================
// MONGOOSE SCHEMAS & MODELS
// ===============================

// User Schema (for admin/teacher access)
const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'teacher', enum: ['teacher', 'admin'] },
  created_at: { type: Date, default: Date.now },
});

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  guardianName: { type: String },
  guardianPhone: { type: String },
  admissionDate: { type: Date, default: Date.now },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive', 'graduated'],
  },
  created_at: { type: Date, default: Date.now },
});

// Grade Schema
const gradeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: { type: String, required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String },
  term: { type: String, required: true },
  academic_year: { type: String, required: true },
  remarks: { type: String },
  created_at: { type: Date, default: Date.now },
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  date: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late', 'excused'],
  },
  remarks: { type: String },
  created_at: { type: Date, default: Date.now },
});

// Fee Schema
const feeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: { type: Number, required: true },
  payment_date: { type: Date, default: Date.now },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'cheque'],
  },
  term: { type: String, required: true },
  academic_year: { type: String, required: true },
  status: {
    type: String,
    default: 'paid',
    enum: ['paid', 'pending', 'overdue'],
  },
  receipt_number: { type: String },
  created_at: { type: Date, default: Date.now },
});

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info',
  },
  category: {
    type: String,
    enum: ['student', 'grade', 'attendance', 'fee', 'system'],
    default: 'system',
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// ===============================
// MIDDLEWARE
// ===============================
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token)
    return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// ===============================
// TEST ROUTE
// ===============================
app.get('/', async (req, res) => {
  try {
    const studentCount = await Student.countDocuments();
    const userCount = await User.countDocuments();
    res.json({
      message: '🎓 School Management System API',
      status: 'Running',
      database: 'Connected',
      stats: {
        total_students: studentCount,
        total_users: userCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// AUTH ROUTES
// ===============================
app.post('/register', async (req, res) => {
  const { full_name, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      full_name,
      email,
      password: hashedPassword,
      role: role || 'teacher',
    });

    await user.save();
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ===============================
// STUDENT ROUTES (CRUD)
// ===============================

// Get all students
app.get('/api/students', authenticate, async (req, res) => {
  try {
    const { class: studentClass, status, search } = req.query;
    let query = {};

    if (studentClass) query.class = studentClass;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(query).sort({ created_at: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single student by ID
app.get('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new student
app.post('/api/students', authenticate, async (req, res) => {
  const {
    name,
    rollNumber,
    class: studentClass,
    age,
    gender,
    email,
    phone,
    address,
    guardianName,
    guardianPhone,
  } = req.body;

  try {
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }

    const student = new Student({
      name,
      rollNumber,
      class: studentClass,
      age,
      gender,
      email,
      phone,
      address,
      guardianName,
      guardianPhone,
    });

    await student.save();
    const notification = new Notification({
      title: 'New Student Added',
      message: `${student.name} has been added to class ${student.class}`,
      type: 'success',
      category: 'student',
      recipient: req.user.id,
    });
    await notification.save();
    res.status(201).json({ message: 'Student created successfully', student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student
app.put('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const student = await Student.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student updated successfully', student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete('/api/students/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete related records
    await Grade.deleteMany({ student_id: id });
    await Attendance.deleteMany({ student_id: id });
    await Fee.deleteMany({ student_id: id });

    res.json({ message: 'Student and related records deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import students
app.post('/api/students/bulk', authenticate, async (req, res) => {
  const students = req.body.students;

  if (!Array.isArray(students)) {
    return res
      .status(400)
      .json({ error: 'Invalid data format. Expected an array of students.' });
  }

  try {
    const result = await Student.insertMany(students, { ordered: false });
    res.status(201).json({
      message: `${result.length} students imported successfully`,
      students: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// GRADE ROUTES
// ===============================

// Get all grades (NEW ENDPOINT)
app.get('/api/grades/all', authenticate, async (req, res) => {
  try {
    const grades = await Grade.find({})
      .populate('student_id', 'name rollNumber class')
      .sort({ created_at: -1 });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get grades for a student
app.get('/api/grades/student/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;

  try {
    const grades = await Grade.find({ student_id: studentId }).populate(
      'student_id',
      'name rollNumber class'
    );
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grades', authenticate, async (req, res) => {
  const { student_id, subject, marks, term, academic_year, remarks } = req.body;

  try {
    let grade = 'F';
    if (marks >= 90) grade = 'A+';
    else if (marks >= 80) grade = 'A';
    else if (marks >= 70) grade = 'B';
    else if (marks >= 60) grade = 'C';
    else if (marks >= 50) grade = 'D';

    const gradeRecord = new Grade({
      student_id,
      subject,
      marks,
      grade,
      term,
      academic_year,
      remarks,
    });

    await gradeRecord.save();
    const notification = new Notification({
      title: 'Grade Added',
      message: `Grade for ${subject} has been recorded`,
      type: 'info',
      category: 'grade',
      recipient: req.user.id,
    });
    await notification.save();
    res
      .status(201)
      .json({ message: 'Grade added successfully', grade: gradeRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ATTENDANCE ROUTES
// ===============================

app.get('/api/attendance', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Parse the date and set to start of day
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    const endDate = new Date(searchDate);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: { $gte: searchDate, $lte: endDate },
    }).populate('student_id', 'name rollNumber class');

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance for a student
app.get(
  '/api/attendance/student/:studentId',
  authenticate,
  async (req, res) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      let query = { student_id: studentId };
      if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      const attendance = await Attendance.find(query)
        .populate('student_id', 'name rollNumber class')
        .sort({ date: -1 });
      res.json(attendance);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Mark attendance
app.post('/api/attendance', authenticate, async (req, res) => {
  const { student_id, date, status, remarks } = req.body;

  try {
    const existingAttendance = await Attendance.findOne({
      student_id,
      date: new Date(date).setHours(0, 0, 0, 0),
    });

    if (existingAttendance) {
      existingAttendance.status = status;
      existingAttendance.remarks = remarks;
      await existingAttendance.save();
      return res.json({
        message: 'Attendance updated successfully',
        attendance: existingAttendance,
      });
    }

    const attendance = new Attendance({
      student_id,
      date,
      status,
      remarks,
    });

    await attendance.save();
    res
      .status(201)
      .json({ message: 'Attendance marked successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };
    } else {
      // Default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter = { date: { $gte: firstDay, $lte: lastDay } };
    }

    const stats = await Attendance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const formattedStats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
    });

    res.json(formattedStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// FEE ROUTES
// ===============================

app.get('/api/fees', authenticate, async (req, res) => {
  try {
    const { status, term, academic_year } = req.query;
    let query = {};

    if (status) query.status = status;
    if (term) query.term = term;
    if (academic_year) query.academic_year = academic_year;

    const fees = await Fee.find(query)
      .populate('student_id', 'name rollNumber class email')
      .sort({ payment_date: -1 });

    // Add student_name field for easier access in frontend
    const formattedFees = fees.map((fee) => ({
      ...fee.toObject(),
      student_name: fee.student_id?.name || 'N/A',
    }));

    res.json(formattedFees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get fees for a student
app.get('/api/fees/student/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;

  try {
    const fees = await Fee.find({ student_id: studentId })
      .populate('student_id', 'name rollNumber class')
      .sort({ payment_date: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add fee payment
app.post('/api/fees', authenticate, async (req, res) => {
  const {
    student_id,
    amount,
    payment_method,
    term,
    academic_year,
    receipt_number,
    status,
  } = req.body;

  try {
    const fee = new Fee({
      student_id,
      amount,
      payment_method,
      term,
      academic_year,
      receipt_number,
      status: status || 'paid',
    });

    await fee.save();
    const notification = new Notification({
      title: 'Fee Payment Recorded',
      message: `Payment of ₦${amount.toLocaleString()} has been recorded`,
      type: 'success',
      category: 'fee',
      recipient: req.user.id,
    });
    await notification.save();
    res.status(201).json({ message: 'Fee payment recorded successfully', fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// REPORTS & STATISTICS
// ===============================

// Dashboard stats
app.get('/api/stats/dashboard', authenticate, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'active' });
    const totalClasses = await Student.distinct('class');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const presentToday = await Attendance.countDocuments({
      date: today,
      status: 'present',
    });

    const pendingFees = await Fee.countDocuments({ status: 'pending' });

    res.json({
      total_students: totalStudents,
      active_students: activeStudents,
      total_classes: totalClasses.length,
      present_today: presentToday,
      pending_fees: pendingFees,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Class-wise student count
app.get('/api/reports/class-distribution', authenticate, async (req, res) => {
  try {
    const distribution = await Student.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(distribution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top performers
app.get('/api/reports/top-performers', authenticate, async (req, res) => {
  try {
    const topPerformers = await Grade.aggregate([
      {
        $group: {
          _id: '$student_id',
          averageMarks: { $avg: '$marks' },
          totalSubjects: { $sum: 1 },
        },
      },
      { $sort: { averageMarks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          name: '$student.name',
          rollNumber: '$student.rollNumber',
          class: '$student.class',
          averageMarks: 1,
          totalSubjects: 1,
        },
      },
    ]);

    res.json(topPerformers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... existing code ...

// ===============================
// NOTIFICATION ROUTES
// ===============================

// Get all notifications for the current user
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0;
    const notifications = await Notification.find({
      recipient: req.user.id,
    })
      .sort({ created_at: -1 })
      .limit(limit);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
app.delete('/api/notifications/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create notification (for internal use - can be called from other routes)
app.post('/api/notifications', authenticate, async (req, res) => {
  try {
    const { title, message, type, category, recipient } = req.body;

    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      category,
      recipient: recipient || req.user.id,
    });

    await notification.save();

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// RECENT ACTIVITIES ROUTE
// ===============================

function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

app.get('/api/activities/recent', authenticate, async (req, res) => {
  try {
    const limit = 5; // Show last 5 activities
    const activities = [];

    // Get recent students
    const recentStudents = await Student.find({})
      .sort({ created_at: -1 })
      .limit(2)
      .select('name created_at');

    recentStudents.forEach((student) => {
      activities.push({
        type: 'student',
        title: 'New student enrolled',
        description: `${student.name} joined the school`,
        timeAgo: formatTimeAgo(student.created_at),
        created_at: student.created_at,
      });
    });

    // Get recent attendance records
    const recentAttendance = await Attendance.find({})
      .sort({ date: -1 })
      .limit(1)
      .populate('student_id', 'name');

    if (recentAttendance.length > 0) {
      const attendance = recentAttendance[0];
      const presentCount = attendance.records.filter(
        (r) => r.status === 'present'
      ).length;
      activities.push({
        type: 'attendance',
        title: 'Attendance marked',
        description: `${presentCount} students present today`,
        timeAgo: 'Today',
        created_at: attendance.date,
      });
    }

    // Get recent grades
    const recentGrades = await Grade.find({})
      .sort({ created_at: -1 })
      .limit(1)
      .populate('student_id', 'name')
      .populate('subject_id', 'name');

    if (recentGrades.length > 0) {
      const grade = recentGrades[0];
      activities.push({
        type: 'grade',
        title: 'Grade added',
        description: `${grade.student_id.name} scored ${grade.marks}% in ${grade.subject_id.name}`,
        timeAgo: formatTimeAgo(grade.created_at),
        created_at: grade.created_at,
      });
    }

    // Get recent fee payments
    const recentFees = await Fee.find({ status: 'paid' })
      .sort({ created_at: -1 })
      .limit(1)
      .populate('student_id', 'name');

    if (recentFees.length > 0) {
      const fee = recentFees[0];
      activities.push({
        type: 'fee',
        title: 'Fee payment received',
        description: `₦${fee.amount.toLocaleString()} from ${
          fee.student_id.name
        }`,
        timeAgo: formatTimeAgo(fee.created_at),
        created_at: fee.created_at,
      });
    }

    // Sort activities by creation date and limit
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const limitedActivities = activities.slice(0, limit);

    res.json(limitedActivities);
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ error: 'Failed to load recent activities' });
  }
});
// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 School Management Server running on http://localhost:${PORT}`
  );
});
