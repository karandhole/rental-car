import prisma from '../../../lib/db.config.js';
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// try {
//     await transporter.verify();
//     console.log("SMTP Connected");
// } catch (err) {
//     console.error(err);
// }

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

        // Save in database
        const contactMessage = await prisma.contactMessage.create({
            data: {
                name,
                email,
                phone,
                message,
            },
        });

        res.status(200).json({
            success: true,
            message: "Enquiry sent successfully",
            data: contactMessage,
        });


        // --------------------
        // Send Admin Email
        // --------------------
        try {
            await transporter.sendMail({
                from: `"Ekalo Drive" <${process.env.SMTP_USER}>`,
                to: process.env.ADMIN_EMAIL,
                subject: "🚗 New Contact Enquiry",
                html: `
      <h2>New Contact Enquiry</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>

      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
            });

            console.log("✅ Admin email sent");
        } catch (err) {
            console.error("❌ Admin email failed:", err.message);
        }

        // --------------------
        // Customer Auto Reply
        // --------------------
        try {
            await transporter.sendMail({
                from: `"Ekalo Drive Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Thank you for contacting Ekalo Drive",
                html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Thank You for Contacting Ekalo Drive 🚗</h2>

        <p>Dear ${name},</p>

        <p>
          Thank you for contacting <strong>Ekalo Drive</strong>.
          We have received your enquiry successfully.
        </p>

        <p>
          Our support team will contact you shortly.
        </p>

        <hr>

        <p>📧 support@ekalodrive.com</p>

        <p>
          Regards,<br/>
          <strong>Ekalo Drive Team</strong>
        </p>
      </div>
    `,
            });

            console.log("✅ Auto reply sent");
        } catch (err) {
            console.error("❌ Auto reply failed:", err.message);
        }

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
