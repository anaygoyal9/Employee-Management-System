import Message from "../models/Message.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// GET /api/messages
const getAllMessages = async (req, res) => {
    try {
        const { type } = req.query;

        const query = {
            $or: [
                { sender_id: req.user._id },
                { receiver_id: req.user._id },
                { type: "announcement" }
            ]
        };

        if (type && ['dm', 'announcement'].includes(type)) {
            query.type = type;
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .populate('sender_id', 'name email role designation profileImage')
            .populate('receiver_id', 'name email role designation profileImage')
            .limit(100);

        res.status(200).json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/messages
const sendMessage = async (req, res) => {
    try {
        const { receiver_id, subject = "No Subject", content, type = "dm" } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, error: "Message content is required!" });
        }

        if (!["dm", "announcement"].includes(type)) {
            return res.status(400).json({ success: false, error: "Type must be 'dm' or 'announcement'." });
        }

        if (type === "dm") {
            if (!receiver_id || !mongoose.isValidObjectId(receiver_id)) {
                return res.status(400).json({ success: false, error: "Valid recipient is required for direct messages." });
            }
            if (req.user._id.equals(receiver_id)) {
                return res.status(400).json({ success: false, error: "You cannot message yourself." });
            }
        }

        if (type === "announcement" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "Only administrators can broadcast announcements." });
        }

        const message = await Message.create({
            sender_id: req.user._id,
            receiver_id: type === "dm" ? receiver_id : undefined,
            subject: subject.trim(),
            content: content.trim(),
            type
        });

        const populated = await Message.findById(message._id)
            .populate('sender_id', 'name email role designation profileImage')
            .populate('receiver_id', 'name email role designation profileImage');

        // Create notification
        if (type === "dm" && receiver_id) {
            await Notification.create({
                sent_by: req.user._id,
                recipient: receiver_id,
                title: `New Message from ${req.user.name}`,
                message: subject ? `${subject}: ${content.slice(0, 80)}...` : content.slice(0, 100),
                type: "general",
                target_role: "employee"
            });
        } else if (type === "announcement") {
            await Notification.create({
                sent_by: req.user._id,
                title: `Announcement: ${subject}`,
                message: content.slice(0, 120),
                type: "announcement",
                target_role: "all"
            });
        }

        res.status(201).json({ success: true, message: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/messages/:id/read
const markMessageAsRead = async (req, res) => {
    try {
        const message = await Message.findOneAndUpdate(
            { _id: req.params.id, receiver_id: req.user._id },
            { read: true },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ success: false, error: "Message not found or not addressed to you." });
        }

        res.status(200).json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, error: "Message not found!" });
        }

        if (!message.sender_id.equals(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ success: false, error: "You cannot delete this message." });
        }

        await message.deleteOne();
        res.status(200).json({ success: true, message: "Message deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export { getAllMessages, sendMessage, markMessageAsRead, deleteMessage };