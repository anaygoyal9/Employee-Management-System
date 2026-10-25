import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    companyName: { type: String, default: "Enterprise EMS Ltd." },
    companyEmail: { type: String, default: "contact@enterpriseems.com" },
    companyPhone: { type: String, default: "+1 (555) 019-2834" },
    companyAddress: { type: String, default: "100 Innovation Way, Tech Park" },
    workStartTime: { type: String, default: "09:00" },
    workEndTime: { type: String, default: "17:00" },
    workDaysPerWeek: { type: Number, default: 5 },
    currency: { type: String, default: "$" },
    timezone: { type: String, default: "UTC" }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
