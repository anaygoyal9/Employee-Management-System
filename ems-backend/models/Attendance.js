import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['present', 'late', 'half-day', 'absent'],
        default: 'present'
    },
    notes: { type: String, default: "" }
}, { timestamps: true });

// Prevent duplicate attendance records for the same user on the same calendar date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
