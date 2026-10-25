import express from 'express';
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";
import {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    cancelLeave
} from "../controllers/leaveController.js";

const router = express.Router();

// Employee & all authenticated user endpoints
router.post('/apply', authMiddleware, applyLeave);
router.get('/my', authMiddleware, getMyLeaves);
router.patch('/:id/cancel', authMiddleware, cancelLeave);

// Admin endpoints
router.get('/', authMiddleware, adminOnly, getAllLeaves);
router.patch('/:id/status', authMiddleware, adminOnly, updateLeaveStatus);

export default router;
