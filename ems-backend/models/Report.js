import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    report_type: {
        type: String,
        enum: ["user_summary", "attendance_summary", "leave_summary", "schedule_summary", "department_summary"],
        required: true
    },
    title: { type: String, default: "System Report" },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;