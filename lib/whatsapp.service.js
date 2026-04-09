import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendWhatsappOTP = async (phoneNum, otp) => {
  const to = phoneNum.startsWith("+") ? phoneNum : `+91${phoneNum}`;

  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body: `Your OTP is ${otp}. Valid for 5 minutes.`,
  });
};