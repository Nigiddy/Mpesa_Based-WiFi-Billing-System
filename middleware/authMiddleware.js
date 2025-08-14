const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // Remove 'Bearer ' prefix if present
        const tokenValue = token.replace("Bearer ", "");
        
        // Verify token with proper error handling
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        
        // Check if token is expired
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ error: "Token has expired." });
        }
        
        // Add user info to request
        req.admin = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token has expired." });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token." });
        } else {
            console.error('JWT verification error:', err);
            return res.status(401).json({ error: "Invalid token." });
        }
    }
};

module.exports = authMiddleware;
