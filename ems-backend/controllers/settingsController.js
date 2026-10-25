import Settings from "../models/Settings.js";

// GET /api/settings
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
    try {
        const ALLOWED = ["companyName", "companyEmail", "companyPhone", "companyAddress", "workStartTime", "workEndTime", "workDaysPerWeek", "currency", "timezone"];
        const updates = {};
        for (const key of ALLOWED) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
        for (const k of ["workStartTime", "workEndTime"]) {
            if (updates[k] !== undefined && !timeRe.test(updates[k])) {
                return res.status(400).json({ success: false, error: `${k} must be in HH:MM format.` });
            }
        }
        if (updates.workDaysPerWeek !== undefined) {
            const d = Number(updates.workDaysPerWeek);
            if (!Number.isInteger(d) || d < 1 || d > 7) {
                return res.status(400).json({ success: false, error: "workDaysPerWeek must be between 1 and 7." });
            }
            updates.workDaysPerWeek = d;
        }

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(updates);
        } else {
            Object.assign(settings, updates);
        }

        await settings.save();
        res.status(200).json({ success: true, settings, message: "Settings updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export { getSettings, updateSettings };
