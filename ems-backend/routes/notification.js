import express from 'express';
import {
    getMyNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";

const router = express.Router();

router.get('/', authMiddleware, getMyNotifications);
router.patch('/mark-all-read', authMiddleware, markAllAsRead);
router.patch('/:id/read', authMiddleware, markAsRead);
router.post('/', authMiddleware, adminOnly, createNotification);
router.delete('/:id', authMiddleware, deleteNotification);

export default router;