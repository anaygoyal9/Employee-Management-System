import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    sent_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for targeted user notification
    title: { type: String, default: 'Notification' },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['leave', 'schedule', 'announcement', 'attendance', 'system', 'general'],
        default: 'general'
    },
    target_role: {
        type: String,
        enum: ['all', 'user', 'admin', 'employee'],
        default: 'all'
    },
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;