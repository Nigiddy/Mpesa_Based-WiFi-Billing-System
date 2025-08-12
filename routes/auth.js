const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// ✅ Admin Login Route
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // ✅ Check if admin exists
        db.query("SELECT * FROM admins WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: "Database error" });
            }
            if (results.length === 0) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const admin = results[0];

            // ✅ Debugging logs
            console.log("Stored Hashed Password:", admin.password);
            console.log("Password Input for Comparison:", password);

            // ✅ Check password
            const isMatch = await bcrypt.compare(password, admin.password);
            console.log("Password Match Status:", isMatch);

            if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

            // ✅ Generate token
            const token = jwt.sign({ id: admin.id, email: admin.email }, SECRET_KEY, { expiresIn: "1h" });

            // ✅ Send token in response
            res.json({ success: true, message: "Login successful", token });
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
