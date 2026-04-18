import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsappOTP(phone, otp) {
  try {
    const message = await client.messages.create({
      from: "whatsapp:+918793467198", // ✅ NO space
      to: `whatsapp:+91${phone}`,
      contentSid: "HX6aab49dcabe27f5716511aee3e280459",
      contentVariables: JSON.stringify({
        "1": otp
      })
    });

    console.log("OTP sent successfully:", message.sid);
    return true;
  } catch (error) {
    console.error("Twilio OTP error:", error);
    return false;
  }
}