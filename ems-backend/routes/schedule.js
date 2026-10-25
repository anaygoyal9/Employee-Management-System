import express from 'express';
import {
    getAllSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
} from "../controllers/scheduleController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";

const router = express.Router();

router.get('/', authMiddleware, getAllSchedules);
router.get('/:id', authMiddleware, getScheduleById);
router.post('/', authMiddleware, adminOnly, createSchedule);
router.put('/:id', authMiddleware, adminOnly, updateSchedule);
router.delete('/:id', authMiddleware, adminOnly, deleteSchedule);

export default router;