const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    console.log("=================================");
    console.log("AUTH MIDDLEWARE");

    // Check secret
    if (!JWT_SECRET) {
        console.error("❌ JWT_SECRET is missing");

        return res.status(500).json({
            success: false,
            message: "JWT_SECRET is not configured"
        });
    }

    console.log("JWT_SECRET exists:", true);
    console.log("JWT_SECRET length:", JWT_SECRET.length);

    // Get Authorization header
    const authHeader = req.headers.authorization;

    console.log(
        "Authorization header exists:",
        !!authHeader
    );

    if (!authHeader) {
        console.error("❌ Authorization header missing");

        return res.status(401).json({
            success: false,
            message: "Access denied. Token required."
        });
    }

    console.log(
        "Authorization format:",
        authHeader.substring(0, 20) + "..."
    );

    // Check Bearer
    if (!authHeader.startsWith("Bearer ")) {
        console.error(
            "❌ Invalid Authorization format"
        );

        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        });
    }

    // Extract token
    const token = authHeader
        .substring(7)
        .trim();

    console.log(
        "Token exists:",
        !!token
    );

    console.log(
        "Token length:",
        token.length
    );

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Token required."
        });
    }

    // Verify JWT
    try {
        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        console.log(
            "✅ JWT VERIFIED"
        );

        console.log(
            "User ID:",
            decoded.id
        );

        console.log(
            "Email:",
            decoded.email
        );

        console.log(
            "Token expires:",
            new Date(decoded.exp * 1000)
        );

        req.user = {
            id: decoded.id,
            email: decoded.email
        };

        next();

    } catch (error) {

        console.error(
            "❌ JWT VERIFICATION FAILED"
        );

        console.error(
            "Error name:",
            error.name
        );

        console.error(
            "Error message:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};