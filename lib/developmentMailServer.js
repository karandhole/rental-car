import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const MAIL_TO_1 = process.env.MAIL_TO_1;
const MAIL_TO_2 = process.env.MAIL_TO_2;




const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export const sendDevelopmentMail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS in environment.");
  }

  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};

export const sendOtpForTesting = async (otp) => {
  const recipients = [MAIL_TO_1, MAIL_TO_2].filter(Boolean);


  if (!recipients.length) {
    throw new Error("Missing MAIL_TO_1 and MAIL_TO_2 in environment.");
  }

  const subject = "Your OTP for Testing";
  const text = `Your OTP is: ${otp}`;
  const html = `<p>Your OTP is: <b>${otp}</b></p>`;

  return sendDevelopmentMail({
    to: recipients.join(","),
    subject,
    text,
    html,
  });
};
