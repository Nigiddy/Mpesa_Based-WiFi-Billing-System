const bcrypt = require("bcryptjs");
const prisma = require("../config/prismaClient");

const email = "admin@example.com";  // Change this
const password = "admin100"; // Change this

async function createAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Generated Hashed Password:", hashedPassword); // Debugging log

        try {
            await prisma.admin.create({
                data: {
                    email,
                    password: hashedPassword
                }
            });
            console.log("Admin added successfully!");
        } catch (err) {
            console.error("Error inserting admin:", err);
        }
        process.exit();
    } catch (error) {
        console.error("Error hashing password:", error);
        process.exit(1);
    }
}

createAdmin();
