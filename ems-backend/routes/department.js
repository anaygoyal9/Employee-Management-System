import express from 'express';
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";
import {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "../controllers/departmentController.js";

const router = express.Router();

// Authenticated users can view departments (needed for dropdowns & employee views)
router.get('/', authMiddleware, getAllDepartments);
router.get('/:id', authMiddleware, getDepartmentById);

// Admin only operations
router.post('/', authMiddleware, adminOnly, createDepartment);
router.put('/:id', authMiddleware, adminOnly, updateDepartment);
router.delete('/:id', authMiddleware, adminOnly, deleteDepartment);

export default router;
