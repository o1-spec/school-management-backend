const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5000'],
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

// User Schema
const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'teacher', enum: ['teacher', 'admin'] },
  created_at: { type: Date, default: Date.now },
});

// Student Schema (Simplified)
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  created_at: { type: Date, default: Date.now },
});

// Grade Schema (Simplified)
const gradeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: { type: String, required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  created_at: { type: Date, default: Date.now },
});

// Attendance Schema (Simplified)
const attendanceSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  date: { type: Date, required: true },
  status: { type: String, required: true, enum: ['present', 'absent'] },
  created_at: { type: Date, default: Date.now },
});

// Fee Schema (Simplified)
const feeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['paid', 'pending'] },
  payment_date: { type: Date },
  created_at: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);

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
        created_at: user.created_at,
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
        created_at: user.created_at,
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
// STUDENT ROUTES
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

// Get single student
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

// Create student
app.post('/api/students', authenticate, async (req, res) => {
  const { name, rollNumber, class: studentClass, email, phone } = req.body;

  try {
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }

    const student = new Student({
      name,
      rollNumber,
      class: studentClass,
      email,
      phone,
    });

    await student.save();
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

// ===============================
// GRADE ROUTES
// ===============================

// Get all grades
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

// Add grade
app.post('/api/grades', authenticate, async (req, res) => {
  const { student_id, subject, marks } = req.body;

  try {
    const gradeRecord = new Grade({
      student_id,
      subject,
      marks,
    });

    await gradeRecord.save();
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

// Get attendance by date
app.get('/api/attendance', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

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
app.get('/api/attendance/student/:studentId', authenticate, async (req, res) => {
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
});

// Mark attendance
app.post('/api/attendance', authenticate, async (req, res) => {
  const { student_id, date, status } = req.body;

  try {
    const existingAttendance = await Attendance.findOne({
      student_id,
      date: new Date(date).setHours(0, 0, 0, 0),
    });

    if (existingAttendance) {
      existingAttendance.status = status;
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
    });

    await attendance.save();
    res
      .status(201)
      .json({ message: 'Attendance marked successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance stats
app.get('/api/attendance/stats', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };
    } else {
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

// Get all fees
app.get('/api/fees', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const fees = await Fee.find(query)
      .populate('student_id', 'name rollNumber class email')
      .sort({ payment_date: -1 });

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
  const { student_id, amount, status } = req.body;

  try {
    const fee = new Fee({
      student_id,
      amount,
      status: status || 'pending',
      payment_date: status === 'paid' ? new Date() : null,
    });

    await fee.save();
    res.status(201).json({ message: 'Fee recorded successfully', fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update fee status
app.put('/api/fees/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const fee = await Fee.findByIdAndUpdate(
      id,
      { 
        status,
        payment_date: status === 'paid' ? new Date() : null
      },
      { new: true }
    );
    
    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }
    
    res.json({ message: 'Fee updated successfully', fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// DASHBOARD STATS
// ===============================

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

// ===============================
// USER PROFILE ROUTES
// ===============================

// Update user profile
app.put('/api/users/profile', authenticate, async (req, res) => {
  const { full_name, email } = req.body;

  try {
    const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { full_name, email },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change user password
app.put('/api/users/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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