const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");
const auth = require("../middleware/auth");

const router = express.Router();


// =====================================
// Upload Directory
// =====================================

const uploadDir =
    path.join(__dirname, "../uploads");


if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


// =====================================
// Multer Storage
// =====================================

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                uploadDir
            );

        },

        filename: (
            req,
            file,
            cb
        ) => {

            const extension =
                path.extname(
                    file.originalname
                );

            const filename =
                `${Date.now()}-${Math.round(
                    Math.random() * 1E9
                )}${extension}`;

            cb(
                null,
                filename
            );

        }

    });


// =====================================
// File Filter
// =====================================

const fileFilter = (
    req,
    file,
    cb
) => {

    if (
        file.mimetype.startsWith(
            "image/"
        )
    ) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only images are allowed"
            )
        );

    }

};


const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize:
            5 * 1024 * 1024

    }

});


// =====================================
// Upload Image
// =====================================

router.post(
    "/upload",
    auth,
    upload.single("image"),
    (req, res) => {

        if (!req.file) {

            return res.status(400).json({
                message:
                    "No image uploaded"
            });

        }


        res.json({

            message:
                "Image uploaded successfully",

            url:
                `/uploads/${req.file.filename}`

        });

    }
);


// =====================================
// Get Messages
// =====================================

router.get(
    "/:conversationId",
    auth,
    (req, res) => {

        const {
            conversationId
        } = req.params;


        const sql = `

            SELECT

                messages.id,

                messages.content,

                messages.message_type,

                messages.is_read,

                messages.created_at,

                messages.sender_id,

                users.name AS sender_name,

                users.avatar AS sender_avatar

            FROM messages

            JOIN users

            ON users.id =
                messages.sender_id

            WHERE
                messages.conversation_id = ?

            ORDER BY
                messages.created_at ASC

        `;


        db.all(
            sql,
            [conversationId],
            (err, messages) => {

                if (err) {

                    return res.status(500).json({
                        message:
                            "Database error"
                    });

                }


                res.json(
                    messages
                );

            }
        );

    }
);


module.exports = router;