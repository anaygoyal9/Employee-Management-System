import Department from '../models/Department.js';
import User from '../models/User.js';

// GET /api/departments
const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });

        // Aggregate employee counts per department
        const employeeCounts = await User.aggregate([
            { $match: { department: { $ne: null } } },
            { $group: { _id: "$department", count: { $sum: 1 } } }
        ]);

        const countMap = {};
        employeeCounts.forEach(item => {
            countMap[item._id.toString()] = item.count;
        });

        const departmentsWithCounts = departments.map(dept => ({
            ...dept.toObject(),
            employeeCount: countMap[dept._id.toString()] || 0
        }));

        res.status(200).json({ success: true, departments: departmentsWithCounts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/departments/:id
const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ success: false, error: "Department not found." });
        }

        const employeeCount = await User.countDocuments({ department: department._id });

        res.status(200).json({
            success: true,
            department: {
                ...department.toObject(),
                employeeCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/departments
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: "Department name is required." });
        }

        const existing = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
        if (existing) {
            return res.status(400).json({ success: false, error: "A department with this name already exists." });
        }

        const department = new Department({
            name: name.trim(),
            description: description ? description.trim() : ""
        });

        await department.save();

        res.status(201).json({
            success: true,
            department: { ...department.toObject(), employeeCount: 0 },
            message: "Department created successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/departments/:id
const updateDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: "Department name is required." });
        }

        const existing = await Department.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' },
            _id: { $ne: req.params.id }
        });

        if (existing) {
            return res.status(400).json({ success: false, error: "Another department already has this name." });
        }

        const department = await Department.findByIdAndUpdate(
            req.params.id,
            { name: name.trim(), description: description ? description.trim() : "" },
            { new: true, runValidators: true }
        );

        if (!department) {
            return res.status(404).json({ success: false, error: "Department not found." });
        }

        const employeeCount = await User.countDocuments({ department: department._id });

        res.status(200).json({
            success: true,
            department: { ...department.toObject(), employeeCount },
            message: "Department updated successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ success: false, error: "Department not found." });
        }

        const assignedEmployees = await User.countDocuments({ department: department._id });
        if (assignedEmployees > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete department: ${assignedEmployees} employees are currently assigned to it. Reassign them first.`
            });
        }

        await department.deleteOne();

        res.status(200).json({ success: true, message: "Department deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
