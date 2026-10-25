import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true }, // e.g. "17:00"
    location: { type: String, default: "Main Office" },
    details: { type: String, default: "" },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creator_name: { type: String, required: true }
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;