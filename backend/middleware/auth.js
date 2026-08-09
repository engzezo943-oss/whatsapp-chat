const jwt = require("jsonwebtoken");

const JWT_SECRET = "MY_SUPER_SECRET_KEY";

function auth(req, res, next) {

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Token required."
        });
    }

    try {

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
}

module.exports = auth;