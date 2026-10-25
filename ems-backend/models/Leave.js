import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: {
        type: String,
        enum: ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Maternity/Paternity', 'Unpaid Leave'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    decisionReason: { type: String, default: "" },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
