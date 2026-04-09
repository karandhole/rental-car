import prisma from "../../../lib/db.config.js";
import bcrypt from "bcrypt";
import { generateOTP } from "../../utils/otp.util.js";
import { generateTokens } from "../../utils/token.util.js";
import { sendWhatsappOTP } from "../../../lib/whatsapp.service.js";

// ===================== REQUEST OTP =====================
export const requestOTPService = async (phoneNum) => {
  const { otp, otpHash, expiresAt } = await generateOTP();

  await sendWhatsappOTP(phoneNum, otp);

  const user = await prisma.user.upsert({
    where: { phoneNum },
    update: {
      otpHash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
    },
    create: {
      phoneNum,
      otpHash,
      otpExpiresAt: expiresAt,
    },
  });

  console.log("WhatsApp OTP sent to:", phoneNum);
  console.log("OTP (dev only):", otp);

  return user.id;
};

// ===================== VERIFY OTP =====================
export const verifyOTPService = async (phoneNum, otp) => {
  const user = await prisma.user.findUnique({
    where: { phoneNum },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new Error("OTP expired");
  }

  if (user.otpAttempts >= 5) {
    throw new Error("Too many attempts");
  }

  const isValid = await bcrypt.compare(otp, user.otpHash);
  if (!isValid) {
    await prisma.user.update({
      where: { phoneNum },
      data: { otpAttempts: { increment: 1 } },
    });
    throw new Error("Invalid OTP");
  }

  await prisma.user.update({
    where: { phoneNum },
    data: {
      isVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    },
  });

  // 🔑 Generate JWT tokens
  return generateTokens(user.id, "USER");
};