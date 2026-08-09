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
    
    // حالة الـ Dark Mode
    const [darkMode, setDarkMode] = useState(false);

    // Check Login & Theme
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        const savedTheme = localStorage.getItem("darkMode");

        if (savedUser && token) {
            setUser(JSON.parse(savedUser));
        }

        if (savedTheme === "true") {
            setDarkMode(true);
        }
    }, []);

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem("darkMode", newMode);
    };

    // Load Users
    useEffect(() => {
        if (!user) return;

        const loadUsers = async () => {
            try {
                const response = await API.get("/users");
                setUsers(response.data);
            } catch (error) {
                console.error(error);
            }
        };

        loadUsers();
    }, [user]);

    const handleLogin = (userData) => {
        setUser(userData);
        setShowRegister(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setUsers([]);
        setSelectedUser(null);
    };

    if (!user) {
        if (showRegister) {
            return (
                <Register
                    onLogin={handleLogin}
                    onBack={() => setShowRegister(false)}
                />
            );
        }

        return (
            <Login
                onLogin={handleLogin}
                onRegister={() => setShowRegister(true)}
            />
        );
    }

    return (
        <div className={`app ${darkMode ? "dark" : ""}`}>
            <Sidebar
                user={user}
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                onLogout={handleLogout}
                onProfile={() => setShowProfile(true)}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
            />

            <ChatWindow
                currentUser={user}
                selectedUser={selectedUser}
            />
        </div>
    );
}

export default App;