import { useEffect, useState } from "react";

import ProfileModal from "./components/ProfileModal";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

import API from "./api";

function App() {
    const [user, setUser] = useState(null);
    const [showRegister, setShowRegister] = useState(false);

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    const [showProfile, setShowProfile] = useState(false);

    const [darkMode, setDarkMode] = useState(false);

    // =====================================
    // Restore Login + Theme
    // =====================================

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem("user");
            const token = localStorage.getItem("token");
            const savedTheme = localStorage.getItem("darkMode");

            if (savedUser && token) {
                setUser(JSON.parse(savedUser));
            }

            if (savedTheme === "true") {
                setDarkMode(true);
            }
        } catch (error) {
            console.error("Restore session error:", error);

            localStorage.removeItem("user");
            localStorage.removeItem("token");
        }
    }, []);

    // =====================================
    // Dark Mode
    // =====================================

    const toggleDarkMode = () => {
        const newMode = !darkMode;

        setDarkMode(newMode);

        localStorage.setItem(
            "darkMode",
            String(newMode)
        );
    };

    // =====================================
    // Load Users
    // =====================================

    useEffect(() => {
        if (!user) {
            return;
        }

        const loadUsers = async () => {
            try {
                console.log("Loading users...");

                const token =
                    localStorage.getItem("token");

                console.log(
                    "Token exists:",
                    !!token
                );

                const response =
                    await API.get("/users");

                console.log(
                    "Users loaded:",
                    response.data
                );

                setUsers(
                    Array.isArray(response.data)
                        ? response.data
                        : []
                );

            } catch (error) {

                console.error(
                    "Load users error:",
                    error.response?.status,
                    error.response?.data ||
                    error.message
                );

                // =====================================
                // Invalid / Expired Token
                // =====================================

                if (
                    error.response?.status === 401
                ) {
                    console.warn(
                        "Token is invalid or expired. Logging out."
                    );

                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    setUser(null);
                    setUsers([]);
                    setSelectedUser(null);
                }
            }
        };

        loadUsers();

    }, [user]);

    // =====================================
    // Login
    // =====================================

    const handleLogin = (userData) => {

        console.log(
            "Login successful:",
            userData
        );

        setUser(userData);
        setShowRegister(false);
    };

    // =====================================
    // Logout
    // =====================================

    const handleLogout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setUsers([]);
        setSelectedUser(null);
    };

    // =====================================
    // Authentication Pages
    // =====================================

    if (!user) {

        if (showRegister) {

            return (
                <Register
                    onLogin={handleLogin}
                    onBack={() =>
                        setShowRegister(false)
                    }
                />
            );
        }

        return (
            <Login
                onLogin={handleLogin}
                onRegister={() =>
                    setShowRegister(true)
                }
            />
        );
    }

    // =====================================
    // Main Application
    // =====================================

    return (
        <div
            className={`app ${
                darkMode ? "dark" : ""
            }`}
        >

            <Sidebar
                user={user}
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                onLogout={handleLogout}
                onProfile={() =>
                    setShowProfile(true)
                }
                darkMode={darkMode}
                onToggleDarkMode={
                    toggleDarkMode
                }
            />

            <ChatWindow
                currentUser={user}
                selectedUser={selectedUser}
            />

            {showProfile && (
                <ProfileModal
                    user={user}
                    onClose={() =>
                        setShowProfile(false)
                    }
                    onUpdate={(updatedUser) => {
                        setUser(updatedUser);

                        localStorage.setItem(
                            "user",
                            JSON.stringify(
                                updatedUser
                            )
                        );
                    }}
                />
            )}

        </div>
    );
}

export default App;