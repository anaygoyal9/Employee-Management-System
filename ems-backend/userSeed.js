import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectToDatabase from './db/db.js';

import User from './models/User.js';
import Department from './models/Department.js';
import Attendance from './models/Attendance.js';
import Leave from './models/Leave.js';
import Schedule from './models/Schedule.js';
import Notification from './models/Notification.js';
import Message from './models/Message.js';
import Settings from './models/Settings.js';

const seedDatabase = async () => {
    try {
        await connectToDatabase();
        console.log('--- Starting EMS Database Seeding ---');

        // 1. Seed Departments
        const departmentData = [
            { name: "Engineering", description: "Software engineering, product development, and infrastructure" },
            { name: "Human Resources", description: "Employee relations, talent acquisition, and organizational development" },
            { name: "Finance & Accounting", description: "Financial planning, accounting, auditing, and payroll management" },
            { name: "Marketing & Sales", description: "Brand promotion, digital marketing, client acquisition, and growth" },
            { name: "Operations", description: "Facility operations, logistics, vendor relations, and procurement" }
        ];

        const departments = {};
        for (const dept of departmentData) {
            let found = await Department.findOne({ name: dept.name });
            if (!found) {
                found = await Department.create(dept);
                console.log(`Created Department: ${dept.name}`);
            }
            departments[dept.name] = found;
        }

        // 2. Seed Administrator Account
        const adminEmail = "admin@gmail.com";
        const adminPasswordHash = await bcrypt.hash("anaygoyal9", 10);

        let adminUser = await User.findOne({ email: adminEmail });
        if (!adminUser) {
            adminUser = await User.create({
                name: "Anay Goyal",
                email: adminEmail,
                password: adminPasswordHash,
                role: "admin",
                employeeId: "EMP-0001",
                department: departments["Engineering"]._id,
                designation: "Chief Technology Officer",
                salary: 125000,
                phone: "+1 (555) 010-0001",
                address: "100 Admin Blvd, Suite 400",
                status: "active",
                leaveBalance: { casual: 20, sick: 15, annual: 25 }
            });
            console.log(`Created Admin: ${adminUser.email} (Password: anaygoyal9)`);
        } else {
            console.log(`Admin account already exists: ${adminUser.email}`);
        }

        // 3. Seed Sample Employees
        const sampleEmployees = [
            {
                name: "John Doe",
                email: "john@example.com",
                password: "password123",
                role: "employee",
                employeeId: "EMP-1001",
                deptName: "Engineering",
                designation: "Senior Full-Stack Engineer",
                salary: 95000,
                phone: "+1 (555) 012-3456",
                address: "123 Tech Lane, Silicon Valley",
                status: "active"
            },
            {
                name: "Jane Smith",
                email: "jane@example.com",
                password: "password123",
                role: "employee",
                employeeId: "EMP-1002",
                deptName: "Human Resources",
                designation: "HR Talent Specialist",
                salary: 72000,
                phone: "+1 (555) 012-7890",
                address: "456 People Street, New York",
                status: "active"
            },
            {
                name: "Robert Johnson",
                email: "robert@example.com",
                password: "password123",
                role: "employee",
                employeeId: "EMP-1003",
                deptName: "Finance & Accounting",
                designation: "Senior Financial Analyst",
                salary: 88000,
                phone: "+1 (555) 013-1122",
                address: "789 Wall Street, Financial District",
                status: "active"
            },
            {
                name: "Alice Williams",
                email: "alice@example.com",
                password: "password123",
                role: "employee",
                employeeId: "EMP-1004",
                deptName: "Marketing & Sales",
                designation: "Growth Marketing Lead",
                salary: 82000,
                phone: "+1 (555) 014-3344",
                address: "321 Creative Way, Austin",
                status: "active"
            },
            {
                name: "David Miller",
                email: "david@example.com",
                password: "password123",
                role: "employee",
                employeeId: "EMP-1005",
                deptName: "Operations",
                designation: "Operations Logistics Manager",
                salary: 78000,
                phone: "+1 (555) 015-5566",
                address: "654 Supply Chain Road, Chicago",
                status: "active"
            }
        ];

        const createdEmployees = [];
        for (const emp of sampleEmployees) {
            let user = await User.findOne({ email: emp.email });
            if (!user) {
                const hash = await bcrypt.hash(emp.password, 10);
                user = await User.create({
                    name: emp.name,
                    email: emp.email,
                    password: hash,
                    role: emp.role,
                    employeeId: emp.employeeId,
                    department: departments[emp.deptName]._id,
                    designation: emp.designation,
                    salary: emp.salary,
                    phone: emp.phone,
                    address: emp.address,
                    status: emp.status,
                    leaveBalance: { casual: 12, sick: 10, annual: 15 }
                });
                console.log(`Created Employee: ${user.email} (Password: password123)`);
            }
            createdEmployees.push(user);
        }

        // 4. Seed Settings
        let settings = await Settings.findOne();
        if (!settings) {
            await Settings.create({
                companyName: "Enterprise EMS Global",
                companyEmail: "support@enterpriseems.com",
                companyPhone: "+1 (800) 555-0199",
                companyAddress: "500 Corporate Boulevard, Suite 100",
                workStartTime: "09:00",
                workEndTime: "17:00",
                workDaysPerWeek: 5,
                currency: "$",
                timezone: "UTC"
            });
            console.log("Created Default Organization Settings.");
        }

        // 5. Seed Attendance for today and yesterday
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        for (let i = 0; i < createdEmployees.length; i++) {
            const emp = createdEmployees[i];

            // Today's attendance
            const existingToday = await Attendance.findOne({ userId: emp._id, date: todayStr });
            if (!existingToday) {
                const inTime = new Date();
                inTime.setHours(9, i * 10, 0); // some at 9:00, 9:10, 9:20, 9:30, 9:40
                const isLate = i >= 4;

                await Attendance.create({
                    userId: emp._id,
                    date: todayStr,
                    checkIn: inTime,
                    status: isLate ? 'late' : 'present',
                    notes: isLate ? "Delayed due to traffic" : "On-time arrival"
                });
            }

            // Yesterday's attendance (completed with checkout)
            const existingYesterday = await Attendance.findOne({ userId: emp._id, date: yesterdayStr });
            if (!existingYesterday) {
                const yIn = new Date(yesterday);
                yIn.setHours(9, 0, 0);
                const yOut = new Date(yesterday);
                yOut.setHours(17, 30, 0);

                await Attendance.create({
                    userId: emp._id,
                    date: yesterdayStr,
                    checkIn: yIn,
                    checkOut: yOut,
                    totalHours: 8.5,
                    status: 'present',
                    notes: "Full regular shift"
                });
            }
        }
        console.log("Seeded Sample Attendance Records.");

        // 6. Seed Leaves
        const sampleLeaves = [
            {
                userId: createdEmployees[0]._id,
                leaveType: "Casual Leave",
                startDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
                endDate: new Date(Date.now() + 86400000 * 4),
                reason: "Family event and personal commitments",
                status: "Pending"
            },
            {
                userId: createdEmployees[1]._id,
                leaveType: "Sick Leave",
                startDate: new Date(Date.now() - 86400000 * 3),
                endDate: new Date(Date.now() - 86400000 * 2),
                reason: "Seasonal viral flu and recovery",
                status: "Approved",
                decisionReason: "Approved. Medical certificate noted.",
                decidedBy: adminUser._id
            },
            {
                userId: createdEmployees[2]._id,
                leaveType: "Annual Leave",
                startDate: new Date(Date.now() + 86400000 * 10),
                endDate: new Date(Date.now() + 86400000 * 15),
                reason: "Annual vacation trip",
                status: "Pending"
            }
        ];

        for (const l of sampleLeaves) {
            const existing = await Leave.findOne({ userId: l.userId, startDate: l.startDate });
            if (!existing) {
                await Leave.create(l);
            }
        }
        console.log("Seeded Sample Leaves.");

        // 7. Seed Schedules
        const scheduleDates = [
            todayStr,
            new Date(Date.now() + 86400000).toISOString().split('T')[0],
            new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
        ];

        const sampleSchedules = [
            {
                employeeId: createdEmployees[0]._id,
                department: departments["Engineering"]._id,
                title: "Core Platform Sprint Review",
                date: scheduleDates[0],
                startTime: "10:00",
                endTime: "12:00",
                location: "Conference Room Alpha",
                details: "Review sprint goals, performance metrics, and deployment checklist",
                creator_id: adminUser._id,
                creator_name: adminUser.name
            },
            {
                employeeId: createdEmployees[1]._id,
                department: departments["Human Resources"]._id,
                title: "New Hire Onboarding Session",
                date: scheduleDates[1],
                startTime: "14:00",
                endTime: "16:00",
                location: "Training Hall B",
                details: "Orientation and policy walkthrough for Q4 joining cohort",
                creator_id: adminUser._id,
                creator_name: adminUser.name
            },
            {
                employeeId: createdEmployees[3]._id,
                department: departments["Marketing & Sales"]._id,
                title: "Q4 Marketing Strategy Meeting",
                date: scheduleDates[2],
                startTime: "11:00",
                endTime: "13:00",
                location: "Virtual Room 1",
                details: "Ad campaign analysis, lead conversion report, and budget forecast",
                creator_id: adminUser._id,
                creator_name: adminUser.name
            }
        ];

        for (const s of sampleSchedules) {
            const existing = await Schedule.findOne({ employeeId: s.employeeId, date: s.date, startTime: s.startTime });
            if (!existing) {
                await Schedule.create(s);
            }
        }
        console.log("Seeded Sample Schedules.");

        // 8. Seed Announcements and Notifications
        const existingAnnouncement = await Message.findOne({ type: "announcement" });
        if (!existingAnnouncement) {
            await Message.create({
                sender_id: adminUser._id,
                subject: "Welcome to Enterprise EMS 2026",
                content: "Welcome to the new enterprise Employee Management System! Explore attendance tracking, leave requests, shift schedules, and direct messaging.",
                type: "announcement"
            });
        }

        const existingNotif = await Notification.findOne({ title: "System Maintenance Notice" });
        if (!existingNotif) {
            await Notification.create({
                sent_by: adminUser._id,
                title: "System Maintenance Notice",
                message: "Scheduled platform performance update will take place this Saturday from 2:00 AM to 3:00 AM UTC.",
                type: "system",
                target_role: "all"
            });
        }
        console.log("Seeded Announcements & Notifications.");

        console.log("\n=======================================================");
        console.log(">>> DATABASE SEEDING COMPLETE SUCCESSFULLY! <<<");
        console.log("Administrator Account: admin@gmail.com / admin");
        console.log("Employee Accounts:     john@example.com / password123");
        console.log("                       jane@example.com / password123");
        console.log("                       robert@example.com / password123");
        console.log("=======================================================\n");

        process.exit(0);
    } catch (error) {
        console.error("Seeding failed with error:", error);
        process.exit(1);
    }
};

seedDatabase();