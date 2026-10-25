import Notification from "../models/Notification.js";

// A notification addressed to a specific recipient is visible ONLY to that person.
// Broadcast notifications (no recipient) are visible by target_role.
export const visibleTo = (user) => {
    const roles = ["all", user.role];
    if (user.role === "employee") roles.push("user");
    if (user.role === "user") roles.push("employee");
    return {
        $or: [
            { recipient: user._id },
            { recipient: { $exists: false }, target_role: { $in: roles } },
            { recipient: null, target_role: { $in: roles } }
        ]
    };
};

// GET /api/notifications
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find(visibleTo(req.user))
            .sort({ createdAt: -1 })
            .populate('sent_by', 'name role')
            .limit(50);

        const unreadCount = notifications.filter(n => !n.read_by.some(id => id.equals(req.user._id))).length;

        res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/notifications
const createNotification = async (req, res) => {
    try {
        const { title, message, target_role = "all", recipient, type = "general" } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: "Notification message is required!" });
        }

        const notification = await Notification.create({
            sent_by: req.user._id,
            recipient: recipient || undefined,
            title: title || "Company Announcement",
            message: message.trim(),
            type,
            target_role
        });

        const populated = await Notification.findById(notification._id).populate('sent_by', 'name role');

        res.status(201).json({ success: true, notification: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { read_by: req.user._id } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: "Notification not found!" });
        }

        res.status(200).json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/notifications/mark-all-read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            visibleTo(req.user),
            { $addToSet: { read_by: req.user._id } }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, error: "Notification not found!" });
        }

        if (req.user.role !== 'admin' && !notification.sent_by.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: "Not authorized to delete this notification." });
        }

        await notification.deleteOne();
        res.status(200).json({ success: true, message: "Notification deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getMyNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
};