import crypto from "crypto";
import bcrypt from "bcrypt";

export const generateOTP = async () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  return {
    otp,
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
  };
};
