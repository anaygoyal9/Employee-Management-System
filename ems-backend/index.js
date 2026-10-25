import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from 'cors';
import connectToDatabase from "./db/db.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/userManagement.js";
import departmentRouter from "./routes/department.js";
import attendanceRouter from "./routes/attendance.js";
import leaveRouter from "./routes/leave.js";
import scheduleRouter from "./routes/schedule.js";
import notificationRouter from "./routes/notification.js";
import messagingRouter from "./routes/messaging.js";
import reportRouter from "./routes/report.js";
import settingsRouter from "./routes/settings.js";

const app = express();

// Fail fast on missing configuration
for (const key of ['MONGODB_URI', 'JWT_KEY']) {
    if (!process.env[key]) {
        console.error(`ERROR: Missing required environment variable ${key}`);
        process.exit(1);
    }
}

// Connect to MongoDB
connectToDatabase();

// Middleware
// Allow only the configured frontend origin(s). CLIENT_URL can be a comma-separated list.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/leaves', leaveRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/messages', messagingRouter);
app.use('/api/reports', reportRouter);
app.use('/api/settings', settingsRouter);

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    let status = err.status || 500;
    if (err.name === 'MulterError') status = 400;
    if (err.message === 'Not allowed by CORS') status = 403;
    if (err.message === 'File too large') err.message = 'Image must be 2 MB or smaller.';
    if (status >= 500) console.error("Unhandled Error:", err);
    res.status(status).json({
        success: false,
        error: err.message || "Internal Server Error"
    });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

export default app;