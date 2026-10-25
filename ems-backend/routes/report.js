import express from 'express';
import {
    getAdminDashboardStats,
    getEmployeeDashboardStats,
    exportReportCsv,
    generateReport,
    getAllReports,
    getReportById,
    deleteReport
} from "../controllers/reportModuleController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";

const router = express.Router();

// Live Dashboard Stats
router.get('/stats', authMiddleware, adminOnly, getAdminDashboardStats);
router.get('/employee-stats', authMiddleware, getEmployeeDashboardStats);

// CSV Export
router.get('/export/:type', authMiddleware, adminOnly, exportReportCsv);

// Snapshot reports
router.post('/generate', authMiddleware, adminOnly, generateReport);
router.get('/', authMiddleware, adminOnly, getAllReports);
router.get('/:id', authMiddleware, adminOnly, getReportById);
router.delete('/:id', authMiddleware, adminOnly, deleteReport);

export default router;