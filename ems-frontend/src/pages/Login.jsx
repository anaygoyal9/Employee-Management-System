import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import api from "../utils/api";
import { HiOutlineBriefcase } from "react-icons/hi";
import { FiMail, FiLock, FiAlertCircle, FiArrowRight } from "react-icons/fi";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    // If already logged in, redirect to proper dashboard
    useEffect(() => {
        if (user) {
            navigate(user.role === "admin" ? "/admin-dashboard" : "/employee-dashboard", { replace: true });
        }
        const savedEmail = localStorage.getItem("ems_remember_email");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                email: email.trim(),
                password
            });

            if (response.data.success) {
                const { user: loggedInUser, token } = response.data;

                if (rememberMe) {
                    localStorage.setItem("ems_remember_email", email.trim());
                } else {
                    localStorage.removeItem("ems_remember_email");
                }

                // The effect above redirects once the user is in context
                login(loggedInUser, token);
            } else {
                setError(response.data.error || "Login failed.");
            }
        } catch (err) {
            console.error("Login request error:", err);
            const message = err.response?.data?.error || "Network error. Please make sure backend is running.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md">
                {/* Brand Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-xl shadow-teal-500/20 mb-4">
                        <HiOutlineBriefcase className="text-3xl" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Enterprise EMS
                    </h1>
                    <p className="text-sm text-slate-400 mt-1.5">
                        Employee Management & Operations Portal
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                    <p className="text-xs text-slate-500 mb-6">Enter your credentials to access your portal</p>

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-shake">
                            <FiAlertCircle className="text-base shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                Email Address
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-3.5 top-3.5 text-slate-400 text-base" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <FiLock className="absolute left-3.5 top-3.5 text-slate-400 text-base" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center justify-between text-xs pt-1">
                            <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                />
                                Remember email
                            </label>
                            <span className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                                Need assistance?
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <FiArrowRight className="text-base" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer copyright */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    Enterprise EMS &bull; Secure Authentication System
                </p>
            </div>
        </div>
    );
}