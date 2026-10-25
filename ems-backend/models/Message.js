import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for announcements
    subject: { type: String, default: 'No Subject', trim: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['dm', 'announcement'], required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;