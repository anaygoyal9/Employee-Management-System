import express from 'express';
import {
    getAllMessages,
    sendMessage,
    markMessageAsRead,
    deleteMessage
} from "../controllers/messagingController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/', authMiddleware, getAllMessages);
router.post('/', authMiddleware, sendMessage);
router.patch('/:id/read', authMiddleware, markMessageAsRead);
router.delete('/:id', authMiddleware, deleteMessage);

export default router;