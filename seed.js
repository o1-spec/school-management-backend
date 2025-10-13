const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define simplified schemas matching your backend
const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
  created_at: { type: Date, default: Date.now },
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
});

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

const attendanceSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  created_at: { type: Date, default: Date.now },
});

const feeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
  payment_date: { type: Date },
  created_at: { type: Date, default: Date.now },
});

// Create models
const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Grade.deleteMany({});
    await Attendance.deleteMany({});
    await Fee.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      full_name: 'School Admin',
      email: 'admin@school.com',
      password: hashedPassword,
      role: 'admin',
    });
    await adminUser.save();
    console.log('✅ Admin user created: admin@school.com / admin123');

    // Create teacher user
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacherUser = new User({
      full_name: 'John Teacher',
      email: 'teacher@school.com',
      password: teacherPassword,
      role: 'teacher',
    });
    await teacherUser.save();
    console.log('✅ Teacher user created: teacher@school.com / teacher123');

    // Sample students with various classes
    const sampleStudents = [
      // Class 10A (5 students)
      {
        name: 'Alice Johnson',
        rollNumber: '10A001',
        class: '10A',
        email: 'alice.johnson@email.com',
        phone: '+2348012345601',
        status: 'active',
      },
      {
        name: 'Bob Smith',
        rollNumber: '10A002',
        class: '10A',
        email: 'bob.smith@email.com',
        phone: '+2348012345602',
        status: 'active',
      },
      {
        name: 'Charlie Brown',
        rollNumber: '10A003',
        class: '10A',
        email: 'charlie.brown@email.com',
        phone: '+2348012345603',
        status: 'active',
      },
      {
        name: 'Diana Wilson',
        rollNumber: '10A004',
        class: '10A',
        email: 'diana.wilson@email.com',
        phone: '+2348012345604',
        status: 'active',
      },
      {
        name: 'Edward Davis',
        rollNumber: '10A005',
        class: '10A',
        email: 'edward.davis@email.com',
        phone: '+2348012345605',
        status: 'active',
      },

      // Class 10B (5 students)
      {
        name: 'Fiona Garcia',
        rollNumber: '10B001',
        class: '10B',
        email: 'fiona.garcia@email.com',
        phone: '+2348012345606',
        status: 'active',
      },
      {
        name: 'George Miller',
        rollNumber: '10B002',
        class: '10B',
        email: 'george.miller@email.com',
        phone: '+2348012345607',
        status: 'active',
      },
      {
        name: 'Helen Taylor',
        rollNumber: '10B003',
        class: '10B',
        email: 'helen.taylor@email.com',
        phone: '+2348012345608',
        status: 'active',
      },
      {
        name: 'Ian Anderson',
        rollNumber: '10B004',
        class: '10B',
        email: 'ian.anderson@email.com',
        phone: '+2348012345609',
        status: 'active',
      },
      {
        name: 'Julia Martinez',
        rollNumber: '10B005',
        class: '10B',
        email: 'julia.martinez@email.com',
        phone: '+2348012345610',
        status: 'active',
      },

      // Class 11A (4 students)
      {
        name: 'Kevin Lee',
        rollNumber: '11A001',
        class: '11A',
        email: 'kevin.lee@email.com',
        phone: '+2348012345611',
        status: 'active',
      },
      {
        name: 'Laura Thompson',
        rollNumber: '11A002',
        class: '11A',
        email: 'laura.thompson@email.com',
        phone: '+2348012345612',
        status: 'active',
      },
      {
        name: 'Michael White',
        rollNumber: '11A003',
        class: '11A',
        email: 'michael.white@email.com',
        phone: '+2348012345613',
        status: 'active',
      },
      {
        name: 'Nancy Harris',
        rollNumber: '11A004',
        class: '11A',
        email: 'nancy.harris@email.com',
        phone: '+2348012345614',
        status: 'active',
      },

      // Class 11B (4 students)
      {
        name: 'Oliver Clark',
        rollNumber: '11B001',
        class: '11B',
        email: 'oliver.clark@email.com',
        phone: '+2348012345615',
        status: 'active',
      },
      {
        name: 'Patricia Lewis',
        rollNumber: '11B002',
        class: '11B',
        email: 'patricia.lewis@email.com',
        phone: '+2348012345616',
        status: 'active',
      },
      {
        name: 'Quinn Walker',
        rollNumber: '11B003',
        class: '11B',
        email: 'quinn.walker@email.com',
        phone: '+2348012345617',
        status: 'active',
      },
      {
        name: 'Rachel Hall',
        rollNumber: '11B004',
        class: '11B',
        email: 'rachel.hall@email.com',
        phone: '+2348012345618',
        status: 'active',
      },

      // Class 12A (3 students)
      {
        name: 'Samuel Young',
        rollNumber: '12A001',
        class: '12A',
        email: 'samuel.young@email.com',
        phone: '+2348012345619',
        status: 'active',
      },
      {
        name: 'Tina King',
        rollNumber: '12A002',
        class: '12A',
        email: 'tina.king@email.com',
        phone: '+2348012345620',
        status: 'active',
      },
      {
        name: 'Uma Wright',
        rollNumber: '12A003',
        class: '12A',
        email: 'uma.wright@email.com',
        phone: '+2348012345621',
        status: 'active',
      },

      // Class 12B (4 students, 1 inactive)
      {
        name: 'Victor Scott',
        rollNumber: '12B001',
        class: '12B',
        email: 'victor.scott@email.com',
        phone: '+2348012345622',
        status: 'active',
      },
      {
        name: 'Wendy Green',
        rollNumber: '12B002',
        class: '12B',
        email: 'wendy.green@email.com',
        phone: '+2348012345623',
        status: 'active',
      },
      {
        name: 'Xavier Adams',
        rollNumber: '12B003',
        class: '12B',
        email: 'xavier.adams@email.com',
        phone: '+2348012345624',
        status: 'inactive', // Inactive student
      },
      {
        name: 'Yara Baker',
        rollNumber: '12B004',
        class: '12B',
        email: 'yara.baker@email.com',
        phone: '+2348012345625',
        status: 'active',
      },
    ];

    // Create students
    console.log('👨‍🎓 Creating students...');
    const createdStudents = [];
    for (const studentData of sampleStudents) {
      const student = new Student(studentData);
      await student.save();
      createdStudents.push(student);
    }
    console.log(`✅ Created ${createdStudents.length} students`);

    // Create TODAY'S attendance records (mark most students as present)
    console.log('📊 Creating today\'s attendance records...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStudents = createdStudents.filter((s) => s.status === 'active');
    let presentCount = 0;

    for (let i = 0; i < activeStudents.length; i++) {
      const student = activeStudents[i];
      // Mark 80% as present, 20% as absent
      const status = i % 5 === 0 ? 'absent' : 'present';

      const attendance = new Attendance({
        student_id: student._id,
        date: today,
        status: status,
      });
      await attendance.save();

      if (status === 'present') presentCount++;
    }
    console.log(`✅ Created attendance for ${activeStudents.length} students (${presentCount} present)`);

    // Create grades for students
    console.log('📚 Creating grade records...');
    const subjects = [
      'Mathematics',
      'English',
      'Physics',
      'Chemistry',
      'Biology',
      'Computer Science',
    ];

    let gradeCount = 0;
    for (const student of activeStudents.slice(0, 15)) {
      // Only first 15 students get grades
      for (let i = 0; i < 3; i++) {
        // 3 subjects per student
        const grade = new Grade({
          student_id: student._id,
          subject: subjects[i],
          marks: Math.floor(Math.random() * 40) + 60, // Random marks between 60-100
        });
        await grade.save();
        gradeCount++;
      }
    }
    console.log(`✅ Created ${gradeCount} grade records`);

    // Create pending fee records
    console.log('💰 Creating pending fee records...');
    const feeAmounts = [50000, 45000, 55000, 48000, 52000, 60000];
    let pendingFeeCount = 0;

    for (let i = 0; i < 10; i++) {
      // 10 students with pending fees
      const student = activeStudents[i];
      const fee = new Fee({
        student_id: student._id,
        amount: feeAmounts[i % feeAmounts.length],
        status: 'pending',
      });
      await fee.save();
      pendingFeeCount++;
    }

    // Create some paid fee records
    for (let i = 10; i < 15; i++) {
      const student = activeStudents[i];
      const fee = new Fee({
        student_id: student._id,
        amount: feeAmounts[i % feeAmounts.length],
        status: 'paid',
        payment_date: new Date(),
      });
      await fee.save();
    }

    console.log(`✅ Created ${pendingFeeCount} pending fee records`);

    // Display summary
    const totalClasses = await Student.distinct('class');
    const activeCount = await Student.countDocuments({ status: 'active' });

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📊 DASHBOARD STATS:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Students: ${createdStudents.length}`);
    console.log(`Active Students: ${activeCount}`);
    console.log(`Total Classes: ${totalClasses.length} (${totalClasses.join(', ')})`);
    console.log(`Present Today: ${presentCount}`);
    console.log(`Pending Fees: ${pendingFeeCount}`);
    console.log('═══════════════════════════════════════\n');

    console.log('👤 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log('Admin Account:');
    console.log('  Email: admin@school.com');
    console.log('  Password: admin123');
    console.log('\nTeacher Account:');
    console.log('  Email: teacher@school.com');
    console.log('  Password: teacher123');
    console.log('═══════════════════════════════════════\n');

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