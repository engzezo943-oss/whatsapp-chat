const express = require("express");
const db = require("../database");
const auth = require("../middleware/auth");

const router = express.Router();

const allowedReactions = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
    "🎉"
];

// ======================================
// Get Reactions For Conversation
// ======================================
router.get(
    "/conversation/:conversationId",
    auth,
    (req, res) => {
        const conversationId = Number(req.params.conversationId);

        db.all(
            `
            SELECT
                message_reactions.id,
                message_reactions.message_id,
                message_reactions.user_id,
                message_reactions.reaction
            FROM message_reactions
            JOIN messages
                ON messages.id = message_reactions.message_id
            WHERE messages.conversation_id = ?
            ORDER BY message_reactions.created_at ASC
            `,
            [conversationId],
            (err, reactions) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Database error" });
                }
                res.json(reactions);
            }
        );
    }
);

// ======================================
// Add / Change Reaction
// ======================================
router.post(
    "/:messageId",
    auth,
    (req, res) => {
        const messageId = Number(req.params.messageId);
        const userId = Number(req.user.id);
        const { reaction } = req.body;

        if (!allowedReactions.includes(reaction)) {
            return res.status(400).json({ message: "Invalid reaction" });
        }

        db.get(
            `
            SELECT id
            FROM messages
            WHERE id = ?
            `,
            [messageId],
            (err, message) => {
                if (err) {
                    return res.status(500).json({ message: "Database error" });
                }

                if (!message) {
                    return res.status(404).json({ message: "Message not found" });
                }

                db.run(
                    `
                    INSERT INTO message_reactions (message_id, user_id, reaction)
                    VALUES (?, ?, ?)
                    ON CONFLICT(message_id, user_id)
                    DO UPDATE SET reaction = excluded.reaction
                    `,
                    [messageId, userId, reaction],
                    function (err) {
                        if (err) {
                            console.error("Reaction DB error:", err);
                            return res.status(500).json({ message: "Failed to save reaction" });
                        }

                        res.json({
                            success: true,
                            messageId,
                            userId,
                            reaction
                        });
                    }
                );
            }
        );
    }
);

// ======================================
// Delete Reaction
// ======================================
router.delete(
    "/:messageId",
    auth,
    (req, res) => {
        const messageId = Number(req.params.messageId);
        const userId = Number(req.user.id);

        db.run(
            `
            DELETE FROM message_reactions
            WHERE message_id = ? AND user_id = ?
            `,
            [messageId, userId],
            function (err) {
                if (err) {
                    console.error("Reaction DB error:", err);
                    return res.status(500).json({ message: "Failed to delete reaction" });
                }

                res.json({
                    success: true,
                    messageId,
                    userId,
                    message: "Reaction removed"
                });
            }
        );
    }
);

module.exports = router;