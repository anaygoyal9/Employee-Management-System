import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Please provide both email and password." });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('department', 'name');
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid email or password." });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, error: "Your account has been deactivated. Please contact an administrator." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: "10d" }
        );

        const sanitizedUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            department: user.department,
            designation: user.designation,
            phone: user.phone,
            address: user.address,
            salary: user.salary,
            joiningDate: user.joiningDate,
            status: user.status,
            profileImage: user.profileImage,
            leaveBalance: user.leaveBalance
        };

        res.status(200).json({
            success: true,
            token,
            user: sanitizedUser
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const verify = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export { login, verify };