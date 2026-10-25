import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ success: false, error: "Authentication token not provided." });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(decoded.id).select('-password').populate('department', 'name');

        if (!user) {
            return res.status(401).json({ success: false, error: "User not found." });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, error: "Your account is deactivated. Please contact an administrator." });
        }

        req.user = user;

        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: "Token invalid or expired." });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export default verifyUser;