const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied. Administrators only." });
    }
    next();
};

export default adminOnly;