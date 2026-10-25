import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const UserContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const verifyUser = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = await api.get("/auth/verify");
            if (response.data.success) {
                setUser(response.data.user);
            } else {
                localStorage.removeItem("token");
                setUser(null);
            }
        } catch (error) {
            console.error("User verification failed:", error);
            localStorage.removeItem("token");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const login = (userData, token) => {
        if (token) {
            localStorage.setItem("token", token);
        }
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("token");
        navigate("/login");
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const refreshUser = async () => {
        try {
            const response = await api.get("/auth/verify");
            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (err) {
            console.error("Failed to refresh user:", err);
        }
    };

    return (
        <UserContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// Backwards-compatibility alias
export const userAuth = useAuth;

export default AuthProvider;