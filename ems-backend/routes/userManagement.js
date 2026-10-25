import express from 'express';
import authMiddleware from "../middlewares/authMiddleware.js";
import adminOnly from "../middlewares/adminOnly.js";
import upload from "../middlewares/upload.js";
import {
    getAllUsers,
    getDirectory,
    getUserById,
    addUser,
    updateUser,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    uploadProfileImage,
    getProfileImage
} from "../controllers/userManagementController.js";

const router = express.Router();

// Public route to serve profile images directly via <img>
router.get('/profile-image/:fileId', getProfileImage);

// Authenticated routes
router.get('/', authMiddleware, adminOnly, getAllUsers);
router.post('/addUser', authMiddleware, adminOnly, addUser);
router.post('/profile-image', authMiddleware, upload.single('profileImage'), uploadProfileImage);

// must be declared before '/:id'
router.get('/directory', authMiddleware, getDirectory);

router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.patch('/:id/status', authMiddleware, adminOnly, updateUserStatus);
router.patch('/:id/role', authMiddleware, adminOnly, updateUserRole);
router.delete('/:id', authMiddleware, adminOnly, deleteUser);

export default router;