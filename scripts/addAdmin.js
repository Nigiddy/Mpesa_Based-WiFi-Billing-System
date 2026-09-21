const bcrypt = require("bcryptjs");
const prisma = require("../config/prismaClient");

// AUTH-W1 FIX: Standardised to 12 rounds — matches seed.js and OWASP 2024+ recommendation.
// Prefer environment variables over hard-coded values; change these before running.
const email    = process.env.ADMIN_EMAIL    || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "Admin@1234"; // ⚠️ Change before use!

async function createAdmin() {
    try {
        // AUTH-W1 FIX: Single bcrypt.hash call (no separate genSalt needed);
        // cost factor raised from 10 → 12.
        const hashedPassword = await bcrypt.hash(password, 12);

        // Use upsert so re-running on an existing email updates the password
        // rather than throwing a unique-constraint error.
        await prisma.admin.upsert({
            where:  { email },
            update: { password: hashedPassword, updatedAt: new Date() },
            create: { email, password: hashedPassword },
        });

        console.log(`✅ Admin account ready: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating admin:", error);
        process.exit(1);
    }
}

createAdmin();
