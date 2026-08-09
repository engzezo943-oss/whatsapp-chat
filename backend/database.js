const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./chat.db", (err) => {

    if (err) {

        console.error(
            "Database connection error:",
            err.message
        );

    } else {

        console.log(
            "SQLite database connected"
        );

    }

});


db.serialize(() => {

    // =========================
    // Users
    // =========================

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            avatar TEXT,

            status TEXT DEFAULT 'offline',

            last_seen DATETIME,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // =========================
    // Conversations
    // =========================

    db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            type TEXT DEFAULT 'private',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // =========================
    // Conversation Members
    // =========================

    db.run(`
        CREATE TABLE IF NOT EXISTS conversation_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,

            user_id INTEGER NOT NULL,

            FOREIGN KEY (conversation_id)
            REFERENCES conversations(id)
            ON DELETE CASCADE,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

            UNIQUE(conversation_id, user_id)
        )
    `);


    // =========================
    // Messages
    // =========================

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,

            sender_id INTEGER NOT NULL,

            content TEXT NOT NULL,

            message_type TEXT DEFAULT 'text',

            is_read INTEGER DEFAULT 0,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (conversation_id)
            REFERENCES conversations(id)
            ON DELETE CASCADE,

            FOREIGN KEY (sender_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
    `);


    // =========================
    // Message Reactions
    // =========================

    db.run(`
        CREATE TABLE IF NOT EXISTS message_reactions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            message_id INTEGER NOT NULL,

            user_id INTEGER NOT NULL,

            reaction TEXT NOT NULL,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (message_id)
            REFERENCES messages(id)
            ON DELETE CASCADE,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

            UNIQUE(message_id, user_id)
        )
    `);


    console.log(
        "Database tables ready"
    );

});


module.exports = db;