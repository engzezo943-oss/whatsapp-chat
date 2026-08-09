const express = require("express");

const db = require("../database");

const auth = require("../middleware/auth");

const router = express.Router();


// ======================================
// Create / Get Private Conversation
// ======================================

router.post("/private/:userId", auth, (req, res) => {

    const currentUserId = req.user.id;

    const otherUserId =
        Number(req.params.userId);


    if (currentUserId === otherUserId) {

        return res.status(400).json({
            message: "Cannot chat with yourself"
        });

    }


    // Find existing conversation

    const sql = `
        SELECT c.id
        FROM conversations c

        JOIN conversation_members cm1
        ON c.id = cm1.conversation_id

        JOIN conversation_members cm2
        ON c.id = cm2.conversation_id

        WHERE cm1.user_id = ?
        AND cm2.user_id = ?

        AND c.type = 'private'

        LIMIT 1
    `;


    db.get(
        sql,
        [
            currentUserId,
            otherUserId
        ],
        (err, conversation) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error"
                });

            }


            // Conversation exists

            if (conversation) {

                return res.json({
                    conversationId:
                        conversation.id
                });

            }


            // Create conversation

            db.run(
                `
                INSERT INTO conversations
                (type)
                VALUES ('private')
                `,
                function (err) {

                    if (err) {

                        return res.status(500).json({
                            message: "Failed to create conversation"
                        });

                    }


                    const conversationId =
                        this.lastID;


                    // Add both users

                    const stmt =
                        db.prepare(`
                            INSERT INTO
                            conversation_members
                            (
                                conversation_id,
                                user_id
                            )
                            VALUES (?, ?)
                        `);


                    stmt.run(
                        conversationId,
                        currentUserId
                    );


                    stmt.run(
                        conversationId,
                        otherUserId
                    );


                    stmt.finalize();


                    res.status(201).json({
                        conversationId
                    });

                }
            );

        }
    );

});


module.exports = router;