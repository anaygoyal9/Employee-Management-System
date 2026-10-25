import express from 'express';
import { login, verify } from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rateLimit from "../middlewares/rateLimit.js";
import { changePassword } from "../controllers/userManagementController.js";

const router = express.Router();

router.post('/login', rateLimit({ max: 10, windowMs: 15 * 60 * 1000, message: 'Too many login attempts. Try again in 15 minutes.' }), login);
router.get('/verify', authMiddleware, verify);
router.post('/verify', authMiddleware, verify);
router.patch('/change-password', authMiddleware, changePassword);
router.post('/change-password', authMiddleware, changePassword);
router.patch('/change-password-field', authMiddleware, changePassword);

export default router;