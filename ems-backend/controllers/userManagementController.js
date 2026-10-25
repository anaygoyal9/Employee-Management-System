import User from "../models/User.js";
import Department from "../models/Department.js";
import bcrypt from 'bcrypt';
import mongoose from "mongoose";
import escapeRegex from "../utils/escapeRegex.js";

// GridFS bucket for profile images
const getBucket = () => {
    if (!mongoose.connection.db) {
        throw new Error("Database not connected yet.");
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'profileImages' });
};

// GET /api/users?page=1&limit=10&search=john&department=...&role=...&status=...
const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search ? req.query.search.trim() : "";
        const department = req.query.department || "";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const SORTABLE = ["createdAt", "name", "email", "employeeId", "designation", "joiningDate", "status", "role"];
        const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        const filter = {};

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { name: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } },
                { employeeId: { $regex: safe, $options: 'i' } },
                { designation: { $regex: safe, $options: 'i' } }
            ];
        }

        if (department && mongoose.isValidObjectId(department)) {
            filter.department = department;
        }

        if (['admin', 'employee', 'user'].includes(role)) {
            filter.role = role;
        }

        if (['active', 'inactive'].includes(status)) {
            filter.status = status;
        }

        const totalUsers = await User.countDocuments(filter);

        const users = await User.find(filter)
            .select('-password')
            .populate('department', 'name')
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            users,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit) || 1,
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/users/directory  (any logged-in user; minimal public fields, used by messaging)
const getDirectory = async (req, res) => {
    try {
        const users = await User.find({ status: 'active', _id: { $ne: req.user._id } })
            .select('name role designation profileImage')
            .sort({ name: 1 });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, error: "Invalid user ID format." });
        }

        // Regular users can only access their own record
        if (req.user.role !== 'admin' && !req.user._id.equals(id)) {
            return res.status(403).json({ success: false, error: "Access denied to other employee records." });
        }

        const user = await User.findById(id).select("-password").populate('department', 'name description');
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/users/addUser
const addUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role = "employee",
            employeeId,
            department,
            designation,
            salary,
            phone,
            address,
            joiningDate,
            status = "active"
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: "Name, email, and password are required!" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: "Invalid email format!" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
            return res.status(400).json({ success: false, error: "An employee with this email already exists." });
        }

        // Generate or check employeeId
        let finalEmpId = employeeId ? employeeId.trim().toUpperCase() : null;
        if (finalEmpId) {
            const existingId = await User.findOne({ employeeId: finalEmpId });
            if (existingId) {
                return res.status(400).json({ success: false, error: "Employee ID already exists. Please choose a unique ID." });
            }
        } else {
            // Generate auto employee ID
            const last = await User.find({ employeeId: /^EMP-\d+$/ }).sort({ employeeId: -1 }).limit(1).select('employeeId');
            const lastNum = last.length ? parseInt(last[0].employeeId.split('-')[1], 10) : 0;
            finalEmpId = `EMP-${(lastNum + 1).toString().padStart(4, '0')}`;
        }

        // Validate department if provided
        if (department && !mongoose.isValidObjectId(department)) {
            return res.status(400).json({ success: false, error: "Invalid department ID." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: passwordHash,
            role: role || "employee",
            employeeId: finalEmpId,
            department: department || undefined,
            designation: designation || "Employee",
            salary: salary ? Number(salary) : 0,
            phone: phone || "",
            address: address || "",
            joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
            status: status || "active"
        });

        await newUser.save();

        const populated = await User.findById(newUser._id).select('-password').populate('department', 'name');

        res.status(201).json({
            success: true,
            user: populated,
            message: "Employee created successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, error: "Invalid user ID format." });
        }

        const isAdmin = req.user.role === 'admin';
        const isSelf = req.user._id.equals(id);

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ success: false, error: "You are not authorized to update this profile." });
        }

        const updates = { ...req.body };

        // Security: Prevent non-admins from changing role, status, salary, or employeeId
        if (!isAdmin) {
            delete updates.role;
            delete updates.status;
            delete updates.salary;
            delete updates.employeeId;
            delete updates.department;
            delete updates.designation;
            delete updates.joiningDate;
            delete updates.leaveBalance;
            delete updates.profileImage;
        }
        // Never let anyone overwrite these through the generic update
        delete updates._id;
        delete updates.leaveBalance;
        delete updates.profileImage;
        delete updates.createdAt;
        delete updates.updatedAt;

        delete updates.password; // password changes must go through changePassword

        if (updates.email) {
            updates.email = updates.email.toLowerCase().trim();
            const existing = await User.findOne({ email: updates.email, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ success: false, error: "Email is already taken by another user." });
            }
        }

        if (updates.employeeId) {
            updates.employeeId = updates.employeeId.trim().toUpperCase();
            const existingId = await User.findOne({ employeeId: updates.employeeId, _id: { $ne: id } });
            if (existingId) {
                return res.status(400).json({ success: false, error: "Employee ID is already taken." });
            }
        }

        if (updates.department === "") {
            updates.department = null;
        }

        const user = await User.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        }).select('-password').populate('department', 'name');

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        res.status(200).json({ success: true, user, message: "User updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/users/:id/status
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ success: false, error: "Status must be 'active' or 'inactive'." });
        }

        if (req.user._id.equals(id) && status === 'inactive') {
            return res.status(400).json({ success: false, error: "You cannot deactivate your own account." });
        }

        const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password').populate('department', 'name');
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        res.status(200).json({
            success: true,
            message: `User marked as ${status}.`,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/users/:id/role
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!role || !["admin", "employee", "user"].includes(role)) {
            return res.status(400).json({ success: false, error: "Role must be 'admin' or 'employee'." });
        }

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        if (targetUser._id.equals(req.user._id) && role !== "admin") {
            return res.status(400).json({ success: false, error: "You cannot remove your own admin privileges." });
        }

        targetUser.role = role;
        await targetUser.save();

        res.status(200).json({
            success: true,
            message: `${targetUser.name} role updated to ${role}.`,
            user: { _id: targetUser._id, name: targetUser.name, email: targetUser.email, role: targetUser.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user._id.equals(id)) {
            return res.status(400).json({ success: false, error: "You cannot delete your own account." });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        // clean up the profile image if stored in GridFS
        const imageId = user.profileImage?.split('/').pop();
        if (imageId && mongoose.isValidObjectId(imageId)) {
            try { await getBucket().delete(new mongoose.Types.ObjectId(imageId)); } catch (e) {}
        }

        res.status(200).json({ success: true, message: "User deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/users/change-password-field or /api/auth/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: "Current and new password are required!" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found!" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Current password is incorrect." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/users/profile-image
const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No image file provided." });
        }

        const targetUserId = (req.user.role === 'admin' && req.body.userId) ? req.body.userId : req.user._id;

        const bucket = getBucket();

        const fileId = await new Promise((resolve, reject) => {
            const stream = bucket.openUploadStream(`${targetUserId}-${Date.now()}`, {
                contentType: req.file.mimetype
            });
            stream.on('error', reject);
            stream.on('finish', () => resolve(stream.id));
            stream.end(req.file.buffer);
        });

        const targetUser = await User.findById(targetUserId);
        const oldImage = targetUser?.profileImage;

        const user = await User.findByIdAndUpdate(
            targetUserId,
            { profileImage: `/api/users/profile-image/${fileId}` },
            { new: true }
        ).select('-password').populate('department', 'name');

        const oldId = oldImage?.split('/').pop();
        if (oldId && mongoose.isValidObjectId(oldId)) {
            try { await bucket.delete(new mongoose.Types.ObjectId(oldId)); } catch (e) {}
        }

        res.status(200).json({ success: true, user, message: "Profile image uploaded successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/users/profile-image/:fileId
const getProfileImage = async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!mongoose.isValidObjectId(fileId)) {
            return res.status(400).json({ success: false, error: "Invalid image id." });
        }

        const _id = new mongoose.Types.ObjectId(fileId);
        const bucket = getBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files.length) {
            return res.status(404).json({ success: false, error: "Image not found!" });
        }

        res.set('Content-Type', files[0].contentType || 'image/jpeg');
        bucket.openDownloadStream(_id)
            .on('error', () => res.status(404).end())
            .pipe(res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAllUsers,
    getDirectory,
    getUserById,
    addUser,
    updateUser,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    changePassword,
    uploadProfileImage,
    getProfileImage
};