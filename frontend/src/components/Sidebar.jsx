import { Search, LogOut, Sun, Moon } from "lucide-react";

export default function Sidebar({
    user,
    users,
    selectedUser,
    onSelectUser,
    onLogout,
    onProfile,
    darkMode,
    onToggleDarkMode
}) {
    return (
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="profile">
                    <div
                        className="avatar profile-clickable"
                        onClick={onProfile}
                    >
                        {user?.avatar ? (
                            <img
                                src={
                                    user.avatar.startsWith("http")
                                        ? user.avatar
                                        : `http://localhost:5000${user.avatar}`
                                }
                                alt={user.name}
                            />
                        ) : (
                            user?.name?.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div>
                        <strong>{user?.name}</strong>
                        <span>Online</span>
                    </div>
                </div>

                <div className="sidebar-actions" style={{ display: "flex", gap: "5px" }}>
                    {/* زر تبديل الدارك مود */}
                    <button
                        className="icon-button"
                        onClick={onToggleDarkMode}
                        title="Toggle Dark Mode"
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <button
                        className="icon-button"
                        onClick={onLogout}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-box">
                <Search size={18} />
                <input placeholder="Search users..." />
            </div>

            {/* Users */}
            <div className="users-list">
                {users.map((item) => (
                    <div
                        key={item.id}
                        className={`user-item ${
                            selectedUser?.id === item.id ? "active" : ""
                        }`}
                        onClick={() => onSelectUser(item)}
                    >
                        <div className="avatar">
                            {item.avatar ? (
                                <img
                                    src={
                                        item.avatar.startsWith("http")
                                            ? item.avatar
                                            : `http://localhost:5000${item.avatar}`
                                    }
                                    alt={item.name}
                                />
                            ) : (
                                item.name?.charAt(0).toUpperCase()
                            )}

                            {item.status === "online" && (
                                <span className="online-dot" />
                            )}
                        </div>

                        <div className="user-info">
                            <strong>{item.name}</strong>
                            <span>
                                {item.status === "online"
                                    ? "Online"
                                    : "Offline"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}