const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./database");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const messagesRoutes = require("./routes/messages");
const conversationsRoutes = require("./routes/conversations");
const reactionsRoutes = require("./routes/reactions");

const app = express();
const server = http.createServer(app);

// =========================
// CORS
// =========================

const allowedOrigins = [
    "https://whatsapp-chat-kappa-five.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
];

app.use(
    cors({
        origin: function (origin, callback) {

            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.error(
                "CORS blocked origin:",
                origin
            );

            return callback(
                new Error("CORS policy violation"),
                false
            );
        },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

// ❌ لا تضيف app.options("*", ...)
// cors middleware فوق يتعامل مع OPTIONS

// =========================
// Middleware
// =========================

app.use(express.json());

// =========================
// Static
// =========================

app.use(
    "/uploads",
    express.static("uploads")
);

// =========================
// Routes
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/reactions", reactionsRoutes);

// =========================
// Test
// =========================

app.get("/", (req, res) => {
    res.json({
        message: "Chat API is running 🚀"
    });
});

// =========================
// Socket.IO
// =========================

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// =========================
// Online Users
// =========================

const onlineUsers = new Map();

io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );

    // =========================
    // USER ONLINE
    // =========================

    socket.on("user_online", (userId) => {

        userId = Number(userId);

        onlineUsers.set(
            userId,
            socket.id
        );

        db.run(
            `
            UPDATE users
            SET
                status = 'online',
                last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [userId]
        );

        io.emit("user_status", {
            userId,
            status: "online"
        });
    });

    // =========================
    // REACTION
    // =========================

    socket.on(
        "message_reaction",
        (data) => {

            const {
                messageId,
                conversationId,
                userId,
                reaction
            } = data;

            io.emit(
                "reaction_updated",
                {
                    messageId,
                    conversationId,
                    userId,
                    reaction
                }
            );
        }
    );

    // =========================
    // SEND MESSAGE
    // =========================

    socket.on(
        "send_message",
        (data, callback) => {

            const {
                conversationId,
                senderId,
                receiverId,
                content,
                messageType = "text",
                clientMessageId
            } = data;

            if (
                !conversationId ||
                !senderId ||
                !receiverId ||
                !content
            ) {

                if (callback) {
                    callback({
                        success: false,
                        message: "Missing message data"
                    });
                }

                return;
            }

            db.run(
                `
                INSERT INTO messages
                (
                    conversation_id,
                    sender_id,
                    content,
                    message_type
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    conversationId,
                    senderId,
                    content,
                    messageType
                ],
                function (err) {

                    if (err) {

                        console.error(
                            "Message save error:",
                            err
                        );

                        if (callback) {
                            callback({
                                success: false,
                                message:
                                    "Failed to save message"
                            });
                        }

                        return;
                    }

                    const message = {

                        id: this.lastID,

                        clientMessageId,

                        conversationId:
                            Number(conversationId),

                        senderId:
                            Number(senderId),

                        receiverId:
                            Number(receiverId),

                        content,

                        messageType,

                        isRead: false,

                        createdAt:
                            new Date().toISOString()
                    };

                    const receiverSocket =
                        onlineUsers.get(
                            Number(receiverId)
                        );

                    if (receiverSocket) {

                        io.to(receiverSocket).emit(
                            "new_message",
                            message
                        );
                    }

                    if (callback) {

                        callback({
                            success: true,
                            message
                        });
                    }
                }
            );
        }
    );

    // =========================
    // TYPING
    // =========================

    socket.on(
        "typing",
        (data) => {

            const receiverSocket =
                onlineUsers.get(
                    Number(data.receiverId)
                );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "user_typing",
                    {
                        userId:
                            Number(data.senderId),

                        typing: true
                    }
                );
            }
        }
    );

    // =========================
    // STOP TYPING
    // =========================

    socket.on(
        "stop_typing",
        (data) => {

            const receiverSocket =
                onlineUsers.get(
                    Number(data.receiverId)
                );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "user_typing",
                    {
                        userId:
                            Number(data.senderId),

                        typing: false
                    }
                );
            }
        }
    );

    // =========================
    // DISCONNECT
    // =========================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "User disconnected:",
                socket.id
            );

            let disconnectedUser = null;

            for (
                const [
                    userId,
                    socketId
                ] of onlineUsers.entries()
            ) {

                if (
                    socketId === socket.id
                ) {

                    disconnectedUser =
                        userId;

                    onlineUsers.delete(
                        userId
                    );

                    break;
                }
            }

            if (
                disconnectedUser !== null
            ) {

                db.run(
                    `
                    UPDATE users
                    SET
                        status = 'offline',
                        last_seen = CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [disconnectedUser]
                );

                io.emit(
                    "user_status",
                    {
                        userId:
                            disconnectedUser,

                        status: "offline"
                    }
                );
            }
        }
    );
});

// =========================
// Start Server
// =========================

const PORT =
    process.env.PORT || 5000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );
    }
);