import express from 'express';
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";

const router = express.Router();

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, adminOnly, updateSettings);

export default router;
