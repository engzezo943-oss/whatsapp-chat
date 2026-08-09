const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");
const auth = require("../middleware/auth");

const router = express.Router();

// =====================================
// Profiles Upload Folder
// =====================================

const uploadDir = path.join(
    __dirname,
    "../uploads/profiles"
);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

// =====================================
// Multer Storage
// =====================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const ext = path.extname(
            file.originalname
        );

        const filename =
            `user-${req.user.id}-${Date.now()}${ext}`;

        cb(null, filename);
    }

});

// =====================================
// File Filter
// =====================================

const fileFilter = (req, file, cb) => {

    if (
        file.mimetype &&
        (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/")
        )
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only image and video files are allowed"
            )
        );
    }

};

// =====================================
// Upload Configuration
// =====================================

const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 50 * 1024 * 1024
    }

});

// =====================================
// GET USERS
// =====================================

router.get(
    "/",
    auth,
    (req, res) => {

        console.log(
            "GET /api/users"
        );

        console.log(
            "Authenticated user:",
            req.user
        );

        // ---------------------------------
        // Check authentication
        // ---------------------------------

        if (!req.user || !req.user.id) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });

        }

        // ---------------------------------
        // Get all users except current user
        // ---------------------------------

        db.all(
            `
            SELECT
                id,
                name,
                email,
                avatar,
                status,
                last_seen,
                created_at
            FROM users
            WHERE id != ?
            ORDER BY name ASC
            `,
            [req.user.id],

            (err, users) => {

                if (err) {

                    console.error(
                        "Get users error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Database error"
                    });

                }

                console.log(
                    "Users returned:",
                    users.length
                );

                // ---------------------------------
                // Return consistent API response
                // ---------------------------------

                return res.json({

                    success: true,

                    users: users || []

                });

            }
        );

    }
);

// =====================================
// GET SINGLE USER
// =====================================

router.get(
    "/:id",
    auth,
    (req, res) => {

        const userId = Number(
            req.params.id
        );

        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });

        }

        db.get(
            `
            SELECT
                id,
                name,
                email,
                avatar,
                status,
                last_seen,
                created_at
            FROM users
            WHERE id = ?
            `,
            [userId],

            (err, user) => {

                if (err) {

                    console.error(
                        "Get single user error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Database error"
                    });

                }

                if (!user) {

                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });

                }

                return res.json({
                    success: true,
                    user
                });

            }
        );

    }
);

// =====================================
// Upload Profile Avatar
// =====================================

router.post(
    "/profile/avatar",
    auth,
    upload.single("avatar"),
    (req, res) => {

        console.log(
            "Avatar upload user:",
            req.user.id
        );

        console.log(
            "Uploaded file:",
            req.file
        );

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message:
                    "Please select an image or video"
            });

        }

        const avatarUrl =
            `/uploads/profiles/${req.file.filename}`;

        db.run(
            `
            UPDATE users
            SET avatar = ?
            WHERE id = ?
            `,
            [
                avatarUrl,
                req.user.id
            ],

            function (err) {

                if (err) {

                    console.error(
                        "Avatar database error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Failed to update avatar"
                    });

                }

                console.log(
                    "Avatar saved:",
                    avatarUrl
                );

                return res.json({

                    success: true,

                    avatar: avatarUrl

                });

            }
        );

    }
);

// =====================================
// Export
// =====================================

module.exports = router;