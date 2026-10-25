import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "employee", "user"], default: "employee" },
    employeeId: { type: String, unique: true, sparse: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation: { type: String, default: "Employee", trim: true },
    salary: { type: Number, default: 0 },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    profileImage: { type: String, default: "" },
    leaveBalance: {
        casual: { type: Number, default: 12 },
        sick: { type: Number, default: 10 },
        annual: { type: Number, default: 15 }
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;

// admin@gmail.com
// anaygoyal9









