const jwt = require("jsonwebtoken");
require("dotenv").config();

const extractToken = (req) => {
    const authHeader = req.header("Authorization");
    if (authHeader) {
        return authHeader.replace(/^Bearer\s+/i, "");
    }

    return req.cookies?.admin_token || null;
};

const authMiddleware = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ error: "Token has expired." });
        }

        if (decoded.role !== "admin") {
            return res.status(403).json({ error: "Admin access required." });
        }

        req.admin = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token has expired." });
        }

        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token." });
        }

        console.error("JWT verification error:", err);
        return res.status(401).json({ error: "Invalid token." });
    }
};

module.exports = authMiddleware;
