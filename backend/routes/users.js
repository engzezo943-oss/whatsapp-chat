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
        const ext = path.extname(file.originalname);
        const filename = `user-${req.user.id}-${Date.now()}${ext}`;
        cb(null, filename);
    }

});


// =====================================
// File Filter (Images & Videos)
// =====================================

const fileFilter = (req, file, cb) => {

    if (
        file.mimetype &&
        (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"))
    ) {
        cb(null, true);
    } else {
        cb(
            new Error("Only image and video files are allowed")
        );
    }

};


const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 50 * 1024 * 1024 // رفع الحد الأقصى إلى 50 ميجابايت
    }

});


// =====================================
// Get Users
// =====================================

router.get(
    "/",
    auth,
    (req, res) => {

        db.all(
            `
            SELECT
                id,
                name,
                email,
                avatar,
                status,
                last_seen
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
                        message: "Database error"
                    });
                }

                res.json(users);

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
                message: "Please select an image or video"
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
                        message: "Failed to update avatar"
                    });
                }


                console.log(
                    "Avatar saved:",
                    avatarUrl
                );


                res.json({
                    success: true,
                    avatar: avatarUrl
                });

            }
        );

    }
);


module.exports = router;