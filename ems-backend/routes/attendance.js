import express from 'express';
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";
import {
    checkIn,
    checkOut,
    getTodayStatus,
    getMyAttendance,
    getAllAttendance,
    getAttendanceSummary,
    adminCreateRecord,
    adminUpdateRecord,
    adminDeleteRecord
} from "../controllers/attendanceController.js";

const router = express.Router();

// Employee & all authenticated user endpoints
router.post('/check-in', authMiddleware, checkIn);
router.post('/check-out', authMiddleware, checkOut);
router.get('/today', authMiddleware, getTodayStatus);
router.get('/my', authMiddleware, getMyAttendance);
router.get('/summary', authMiddleware, getAttendanceSummary);

// Admin endpoints
router.get('/', authMiddleware, adminOnly, getAllAttendance);
router.post('/admin/record', authMiddleware, adminOnly, adminCreateRecord);
router.put('/admin/:id', authMiddleware, adminOnly, adminUpdateRecord);
router.delete('/admin/:id', authMiddleware, adminOnly, adminDeleteRecord);

export default router;
