const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE, // تم التصحيح هنا بإضافة الشرطة السفلية

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =========================
// Test Connection
// =========================

pool.getConnection((err, connection) => {

    if (err) {

        console.error(
            "MySQL connection error:",
            err.message
        );

    } else {

        console.log(
            "MySQL database connected"
        );

        connection.release();

    }

});


// =====================================================
// SQLite-compatible wrapper
// =====================================================

const db = {

    // =========================
    // db.run()
    // =========================

    run(sql, params = [], callback = () => {}) {

        pool.execute(
            sql,
            params,
            function (err, result) {

                if (err) {
                    return callback.call(
                        {},
                        err
                    );
                }

                callback.call(
                    {
                        lastID: result.insertId,
                        changes: result.affectedRows
                    },
                    null
                );

            }
        );

    },


    // =========================
    // db.get()
    // =========================

    get(sql, params = [], callback = () => {}) {

        pool.execute(
            sql,
            params,
            (err, rows) => {

                if (err) {
                    return callback(
                        err
                    );
                }

                callback(
                    null,
                    rows[0]
                );

            }
        );

    },


    // =========================
    // db.all()
    // =========================

    all(sql, params = [], callback = () => {}) {

        pool.execute(
            sql,
            params,
            (err, rows) => {

                if (err) {
                    return callback(
                        err
                    );
                }

                callback(
                    null,
                    rows
                );

            }
        );

    },


    // =========================
    // db.prepare()
    // =========================

    prepare(sql) {

        return {

            run(...params) {

                pool.execute(
                    sql,
                    params
                );

            },

            finalize() {

                // MySQL does not need SQLite-style finalize
                return;

            }

        };

    }

};


// =====================================================
// Create Tables
// =====================================================

const createTables = [

    `
    CREATE TABLE IF NOT EXISTS users (

        id INT AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(255) NOT NULL,

        email VARCHAR(255) UNIQUE NOT NULL,

        password VARCHAR(255) NOT NULL,

        avatar TEXT,

        status VARCHAR(50) DEFAULT 'offline',

        last_seen DATETIME NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
    `,


    `
    CREATE TABLE IF NOT EXISTS conversations (

        id INT AUTO_INCREMENT PRIMARY KEY,

        type VARCHAR(50) DEFAULT 'private',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
    `,


    `
    CREATE TABLE IF NOT EXISTS conversation_members (

        id INT AUTO_INCREMENT PRIMARY KEY,

        conversation_id INT NOT NULL,

        user_id INT NOT NULL,

        FOREIGN KEY (conversation_id)
            REFERENCES conversations(id)
            ON DELETE CASCADE,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        UNIQUE(conversation_id, user_id)

    )
    `,


    `
    CREATE TABLE IF NOT EXISTS messages (

        id INT AUTO_INCREMENT PRIMARY KEY,

        conversation_id INT NOT NULL,

        sender_id INT NOT NULL,

        content TEXT NOT NULL,

        message_type VARCHAR(50) DEFAULT 'text',

        is_read TINYINT DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (conversation_id)
            REFERENCES conversations(id)
            ON DELETE CASCADE,

        FOREIGN KEY (sender_id)
            REFERENCES users(id)
            ON DELETE CASCADE

    )
    `,


    `
    CREATE TABLE IF NOT EXISTS message_reactions (

        id INT AUTO_INCREMENT PRIMARY KEY,

        message_id INT NOT NULL,

        user_id INT NOT NULL,

        reaction VARCHAR(20) NOT NULL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (message_id)
            REFERENCES messages(id)
            ON DELETE CASCADE,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        UNIQUE(message_id, user_id)

    )
    `

];


// =========================
// Run Tables
// =========================

function initializeDatabase() {

    let index = 0;

    function next() {

        if (index >= createTables.length) {

            console.log(
                "MySQL database tables ready"
            );

            return;

        }

        pool.query(
            createTables[index],
            (err) => {

                if (err) {

                    console.error(
                        "Table creation error:",
                        err.message
                    );

                    return;

                }

                index++;

                next();

            }
        );

    }

    next();

}

initializeDatabase();


// =========================
// Export
// =========================

module.exports = db;