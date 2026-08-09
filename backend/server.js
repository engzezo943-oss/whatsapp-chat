const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./database");

// =========================
// Routes
// =========================
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const messagesRoutes = require("./routes/messages");
const conversationsRoutes = require("./routes/conversations");
const reactionsRoutes = require("./routes/reactions");

// =========================
// Express App
// =========================
const app = express();
const server = http.createServer(app);

// =========================
// Allowed Origins
// =========================
// مهم جدًا:
// لا تضع [ ] أو ( ) أو Markdown داخل الرابط
const allowedOrigins = [
    "https://whatsapp-chat-dqi7biphj-jj1-e2a3.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
];

// =========================
// CORS Configuration
// =========================
const corsOptions = {
    origin: function (origin, callback) {

        // السماح للطلبات التي ليس لها Origin
        // مثل Postman
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error("CORS blocked origin:", origin);

        return callback(
            new Error(
                `CORS policy violation: ${origin} is not allowed`
            ),
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
};

// =========================
// Middleware
// =========================
app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json());

// =========================
// Static Uploads
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
// Health Check
// =========================
app.get("/health", (req, res) => {

    res.status(200).json({
        status: "ok",
        message: "WhatsApp Chat API is running",
        database: "connected"
    });

});

// =========================
// Test API
// =========================
app.get("/", (req, res) => {

    res.status(200).json({
        message: "Chat API is running 🚀"
    });

});

// =========================
// Socket.IO
// =========================
const io = new Server(server, {

    cors: {
        origin: allowedOrigins,

        methods: [
            "GET",
            "POST"
        ],

        credentials: true
    },

    transports: [
        "polling",
        "websocket"
    ]
});

// =========================
// Connected Users
// =========================
const onlineUsers = new Map();

// =========================
// Socket Connection
// =========================
io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );

    // =================================
    // USER ONLINE
    // =================================
    socket.on("user_online", (userId) => {

        userId = Number(userId);

        if (!userId) {
            return;
        }

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
            [userId],
            (err) => {

                if (err) {
                    console.error(
                        "Update online status error:",
                        err
                    );
                }

            }
        );

        io.emit(
            "user_status",
            {
                userId,
                status: "online"
            }
        );

    });

    // =================================
    // MESSAGE REACTION
    // =================================
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

    // =================================
    // SEND MESSAGE
    // =================================
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

            // -------------------------
            // Validation
            // -------------------------
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

            // -------------------------
            // Save Message
            // -------------------------
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

                    // -------------------------
                    // Message Object
                    // -------------------------
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

                    // -------------------------
                    // Send To Receiver
                    // -------------------------
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

                    // -------------------------
                    // Confirm To Sender
                    // -------------------------
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

    // =================================
    // TYPING
    // =================================
    socket.on(
        "typing",
        (data) => {

            if (!data) {
                return;
            }

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

    // =================================
    // STOP TYPING
    // =================================
    socket.on(
        "stop_typing",
        (data) => {

            if (!data) {
                return;
            }

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

    // =================================
    // DISCONNECT
    // =================================
    socket.on(
        "disconnect",
        () => {

            console.log(
                "User disconnected:",
                socket.id
            );

            let disconnectedUser = null;

            for (
                const [userId, socketId]
                of onlineUsers.entries()
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
                    [disconnectedUser],
                    (err) => {

                        if (err) {

                            console.error(
                                "Update offline status error:",
                                err
                            );

                        }

                    }
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
// Socket.IO Error Handling
// =========================
io.engine.on(
    "connection_error",
    (err) => {

        console.error(
            "Socket.IO connection error:",
            err.message
        );

    }
);

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

        console.log(
            `Health check: /health`
        );

    }
);