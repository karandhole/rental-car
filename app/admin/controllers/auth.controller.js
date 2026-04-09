import bcrypt from "bcrypt";
import prisma from "../../../lib/db.config.js";
import { generateTokens } from "../../utils/token.util.js";

export const register = async (req, res) => {
  try {
    const {phoneNum, password } = req.body;

    if (!phoneNum || !password) {
      return res.status(400).json({
        message: "Phone number and password required"
      });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { phoneNum }
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists"
      });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        phoneNum,
        password: hashedPassword,
      }
    });

    res.status(201).json({
      message: "Admin created successfully",
      adminId: admin.id,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error creating admin",
      error
    });
  }
};


export const login = async (req, res) => {
  try {
    const { phoneNum, password } = req.body;

    if (!phoneNum || !password) {
      return res.status(400).json({
        message: "Phone number and password required"
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { phoneNum }
    });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found"
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const {accessToken,refreshToken} = generateTokens(admin.id,"ADMIN");

    res.json({
      message: "Login successful",
      accessToken,
      admin: {
        id: admin.id,
        phoneNum: admin.phoneNum,
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Login error",
      error
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;
    console.log(req.admin)

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new passwords are required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};