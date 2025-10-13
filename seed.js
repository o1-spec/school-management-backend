const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define models inline (since they're not in separate files)
const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  guardianName: { type: String },
  guardianPhone: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  remarks: { type: String },
}, { timestamps: true });

const feeSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['cash', 'bank_transfer', 'online', 'cheque'] },
  term: { type: String, required: true },
  academic_year: { type: String, required: true },
  receipt_number: { type: String },
  status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
  payment_date: { type: Date, default: Date.now },
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  category: { type: String, enum: ['system', 'student', 'fee', 'attendance', 'grade'], default: 'system' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Create models
const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);
const Notification = mongoose.model('Notification', notificationSchema);

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional)
    console.log('🧹 Clearing existing data...');
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await Fee.deleteMany({});
    await Notification.deleteMany({});

    // Sample classes
    const classes = ['Class 1A', 'Class 1B', 'Class 2A', 'Class 2B', 'Class 3A', 'Class 3B'];

    // Sample students
    const sampleStudents = [
      // Class 1A
      { name: 'Alice Johnson', rollNumber: '1A001', class: 'Class 1A', age: 6, gender: 'Female', email: 'alice.johnson@email.com', phone: '+1234567890', address: '123 Main St', guardianName: 'John Johnson', guardianPhone: '+1234567891' },
      { name: 'Bob Smith', rollNumber: '1A002', class: 'Class 1A', age: 7, gender: 'Male', email: 'bob.smith@email.com', phone: '+1234567892', address: '456 Oak Ave', guardianName: 'Mary Smith', guardianPhone: '+1234567893' },
      { name: 'Charlie Brown', rollNumber: '1A003', class: 'Class 1A', age: 6, gender: 'Male', email: 'charlie.brown@email.com', phone: '+1234567894', address: '789 Pine Rd', guardianName: 'Linda Brown', guardianPhone: '+1234567895' },
      
      // Class 1B
      { name: 'Diana Wilson', rollNumber: '1B001', class: 'Class 1B', age: 7, gender: 'Female', email: 'diana.wilson@email.com', phone: '+1234567896', address: '321 Elm St', guardianName: 'Robert Wilson', guardianPhone: '+1234567897' },
      { name: 'Edward Davis', rollNumber: '1B002', class: 'Class 1B', age: 6, gender: 'Male', email: 'edward.davis@email.com', phone: '+1234567898', address: '654 Maple Ave', guardianName: 'Sarah Davis', guardianPhone: '+1234567899' },
      
      // Class 2A
      { name: 'Fiona Garcia', rollNumber: '2A001', class: 'Class 2A', age: 8, gender: 'Female', email: 'fiona.garcia@email.com', phone: '+1234567800', address: '987 Cedar St', guardianName: 'Miguel Garcia', guardianPhone: '+1234567801' },
      { name: 'George Miller', rollNumber: '2A002', class: 'Class 2A', age: 9, gender: 'Male', email: 'george.miller@email.com', phone: '+1234567802', address: '147 Birch Rd', guardianName: 'Anna Miller', guardianPhone: '+1234567803' },
      { name: 'Helen Taylor', rollNumber: '2A003', class: 'Class 2A', age: 8, gender: 'Female', email: 'helen.taylor@email.com', phone: '+1234567804', address: '258 Spruce Ave', guardianName: 'David Taylor', guardianPhone: '+1234567805' },
      
      // Class 2B
      { name: 'Ian Anderson', rollNumber: '2B001', class: 'Class 2B', age: 9, gender: 'Male', email: 'ian.anderson@email.com', phone: '+1234567806', address: '369 Willow St', guardianName: 'Karen Anderson', guardianPhone: '+1234567807' },
      { name: 'Julia Martinez', rollNumber: '2B002', class: 'Class 2B', age: 8, gender: 'Female', email: 'julia.martinez@email.com', phone: '+1234567808', address: '741 Poplar Rd', guardianName: 'Carlos Martinez', guardianPhone: '+1234567809' },
      
      // Class 3A
      { name: 'Kevin Lee', rollNumber: '3A001', class: 'Class 3A', age: 10, gender: 'Male', email: 'kevin.lee@email.com', phone: '+1234567810', address: '852 Ash St', guardianName: 'Michelle Lee', guardianPhone: '+1234567811' },
      { name: 'Laura Thompson', rollNumber: '3A002', class: 'Class 3A', age: 11, gender: 'Female', email: 'laura.thompson@email.com', phone: '+1234567812', address: '963 Hickory Ave', guardianName: 'James Thompson', guardianPhone: '+1234567813' },
      { name: 'Michael White', rollNumber: '3A003', class: 'Class 3A', age: 10, gender: 'Male', email: 'michael.white@email.com', phone: '+1234567814', address: '159 Dogwood Rd', guardianName: 'Patricia White', guardianPhone: '+1234567815' },
      
      // Class 3B
      { name: 'Nancy Harris', rollNumber: '3B001', class: 'Class 3B', age: 11, gender: 'Female', email: 'nancy.harris@email.com', phone: '+1234567816', address: '357 Sycamore St', guardianName: 'Richard Harris', guardianPhone: '+1234567817' },
      { name: 'Oliver Clark', rollNumber: '3B002', class: 'Class 3B', age: 10, gender: 'Male', email: 'oliver.clark@email.com', phone: '+1234567818', address: '468 Chestnut Ave', guardianName: 'Barbara Clark', guardianPhone: '+1234567819' },
    ];

    const pendingFees = [
      { amount: 50000, term: 'First Term', academic_year: '2024-2025', receipt_number: 'REC001' },
      { amount: 45000, term: 'Second Term', academic_year: '2024-2025', receipt_number: 'REC002' },
      { amount: 55000, term: 'Third Term', academic_year: '2024-2025', receipt_number: 'REC003' },
      { amount: 48000, term: 'First Term', academic_year: '2024-2025', receipt_number: 'REC004' },
      { amount: 52000, term: 'Second Term', academic_year: '2024-2025', receipt_number: 'REC005' },
    ];

    // Create a sample admin user if it doesn't exist
    let adminUser = await User.findOne({ email: 'admin@school.com' });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        full_name: 'School Admin',
        email: 'admin@school.com',
        password: hashedPassword,
        role: 'admin',
      });
      await adminUser.save();
      console.log('✅ Created admin user: admin@school.com / admin123');
    }

    // Create students
    console.log('👨‍🎓 Creating students...');
    const createdStudents = [];
    for (const studentData of sampleStudents) {
      const student = new Student(studentData);
      await student.save();
      createdStudents.push(student);
    }
    console.log(`✅ Created ${createdStudents.length} students`);

    // Create today's attendance (all present)
    console.log('📊 Creating today\'s attendance records...');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    const attendanceRecords = [];
    for (const student of createdStudents) {
      const attendance = new Attendance({
        student_id: student._id,
        date: today,
        status: 'present',
        remarks: 'Present for the day',
      });
      await attendance.save();
      attendanceRecords.push(attendance);
    }
    console.log(`✅ Created ${attendanceRecords.length} attendance records for today`);

    // Create pending fees for some students
    console.log('💰 Creating pending fee records...');
    const feeRecords = [];
    const studentsWithFees = createdStudents.slice(0, 8); // First 8 students get pending fees

    for (let i = 0; i < studentsWithFees.length; i++) {
      const student = studentsWithFees[i];
      const feeData = pendingFees[i % pendingFees.length]; // Cycle through fee amounts

      const fee = new Fee({
        student_id: student._id,
        amount: feeData.amount,
        payment_method: 'cash',
        term: feeData.term,
        academic_year: feeData.academic_year,
        status: 'pending',
        receipt_number: feeData.receipt_number,
      });
      await fee.save();
      feeRecords.push(fee);
    }
    console.log(`✅ Created ${feeRecords.length} pending fee records`);

    console.log('🎉 Database seeded successfully!');
    console.log({
      summary: {
        students: createdStudents.length,
        attendance: attendanceRecords.length,
        fees: feeRecords.length,
      },
      admin: {
        email: 'admin@school.com',
        password: 'admin123',
      },
    });

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();