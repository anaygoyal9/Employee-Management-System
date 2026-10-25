// Minimal in-memory rate limiter (per IP + route). Fine for a single server process;
// use Redis / express-rate-limit if you scale out.
const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, message = "Too many attempts. Please try again later." } = {}) => {
    return (req, res, next) => {
        const key = `${req.ip}:${req.baseUrl}${req.path}`;
        const now = Date.now();
        const entry = buckets.get(key);

        if (!entry || entry.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        entry.count += 1;
        if (entry.count > max) {
            res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ success: false, error: message });
        }
        next();
    };
};

// Periodically drop expired buckets so the map can't grow forever
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

export default rateLimit;
