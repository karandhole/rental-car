import prisma from '../../../lib/db.config.js';

export const createContactMessage = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!emailRegex.test(String(email).toLowerCase())) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "Invalid phone number. Must be 10 digits." });
        }

        const contactMessage = await prisma.contactMessage.create({
            data: { name, email, phone, message }
        });
        res.status(201).json(contactMessage);
    } catch (error) {
        console.error("Error creating contact message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getAllContactMessages = async (req, res) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching contact messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteContactMessage = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contactMessage.delete({
            where: { id }
        });
        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("Error deleting contact message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
