import bcrypt from "bcrypt"
import prisma from "../../../lib/db.config.js"
import { generateTokens } from "../../utils/token.util.js";


export const createCarPartner = async (req, res) => {
  try {
    const { name,phoneNum,password} = req.body;

    if (!name || !phoneNum || !password) {
      return res.status(400).json({
        message: "Name, Phone Number and password required"
      });
    }

    const existingPartner = await prisma.carPartner.findUnique({
      where: { phoneNum }
    });

    if (existingPartner) {
      return res.status(400).json({
        message: "Car Partner already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await prisma.carPartner.create({
      data: {
        name,
        phoneNum,
        password: hashedPassword,
      }
    });

    res.status(201).json({
      message: "Car Partner created successfully",
      partnerId: partner.id,
      phoneNum,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error creating car partner",
      error
    });
  }
};


export const carPartnerLogin = async (req, res) => {
  try {
    const { phoneNum, password } = req.body;

    if (!phoneNum || !password) {
      return res.status(400).json({
        message: "Phone number and password required"
      });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { phoneNum }
    });

    if (!partner) {
      return res.status(404).json({
        message: "Car Partner not found"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, partner.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token = generateTokens(partner.id,"CAR_PARTNER");

    res.status(200).json({
      message: "Login successful",
      token,
      partner: {
        id: partner.id,
        name: partner.name,
        phoneNum: partner.phoneNum
      }
    });

  } catch (error) {
    console.log(error.message)
    res.status(500).json({
      message: "Error logging in",
      error
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { phoneNum } = req.body;
    if (!phoneNum) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { phoneNum },
    });

    if (!partner) {
      return res.status(404).json({ message: "Car partner not found" });
    }

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("OTP:",otp)
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.carPartner.update({
      where: { phoneNum },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    // In a real app, send SMS here. For now, log it.
    console.log(`OTP for ${phoneNum}: ${otp}`);

    res.status(200).json({
      message: "OTP sent successfully",
      otp, // For development convenience
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error processing forgot password request", error });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phoneNum, otp } = req.body;
    if (!phoneNum || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { phoneNum },
    });

    if (!partner || !partner.otpHash || !partner.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid request or OTP expired" });
    }

    if (new Date() > partner.otpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const isOtpValid = await bcrypt.compare(otp, partner.otpHash);
    if (!isOtpValid) {
      await prisma.carPartner.update({
        where: { phoneNum },
        data: { otpAttempts: { increment: 1 } },
      });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Error verifying OTP", error });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { phoneNum } = req.body;
    if (!phoneNum) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { phoneNum },
    });

    if (!partner) {
      return res.status(404).json({ message: "Car partner not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.carPartner.update({
      where: { phoneNum },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    console.log(`Resent OTP for ${phoneNum}: ${otp}`);

    res.status(200).json({
      message: "OTP resent successfully",
      otp,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Error resending OTP", error });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { phoneNum, otp, newPassword } = req.body;
    if (!phoneNum || !otp || !newPassword) {
      return res.status(400).json({ message: "Phone number, OTP, and new password are required" });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { phoneNum },
    });

    if (!partner || !partner.otpHash || !partner.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (new Date() > partner.otpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const isOtpValid = await bcrypt.compare(otp, partner.otpHash);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP link" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.carPartner.update({
      where: { phoneNum },
      data: {
        password: hashedPassword,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password", error });
  }
};