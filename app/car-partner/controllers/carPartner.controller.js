import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/db.config.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitName = (fullName) => {
  if (!fullName || !String(fullName).trim()) {
    return { firstName: "", lastName: "" };
  }
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const validateNewPassword = (password) => {
  const errors = [];
  if (!password || typeof password !== "string") {
    errors.push("New password is required");
    return errors;
  }
  if (password.length < 8) {
    errors.push("New password must be at least 8 characters");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("New password must contain at least one number");
  }
  if (!/[!@#$%^&*()]/.test(password)) {
    errors.push("New password must contain at least one special character (!@#$%^&*())");
  }
  return errors;
};

export const getCarPartnerProfile = async (req, res) => {
  try {
    const partnerId = req.carPartner.id;
    const profile = await prisma.carPartner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNum: true,
        status: true,
        address: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const { firstName, lastName } = splitName(profile.name);

    res.status(200).json({
      id: profile.id,
      firstName,
      lastName,
      email: profile.email ?? "",
      phoneNum: profile.phoneNum,
      addressLine: profile.address ?? "",
      status: profile.status,
      createdAt: profile.createdAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

const validateProfileUpdate = (body) => {
  const errors = [];
  const { firstName, lastName, email, addressLine } = body;

  if (firstName === undefined || !String(firstName).trim()) {
    errors.push({ field: "firstName", message: "First name is required" });
  } else if (String(firstName).trim().length > 100) {
    errors.push({ field: "firstName", message: "First name must be at most 100 characters" });
  }

  if (lastName === undefined || !String(lastName).trim()) {
    errors.push({ field: "lastName", message: "Last name is required" });
  } else if (String(lastName).trim().length > 100) {
    errors.push({ field: "lastName", message: "Last name must be at most 100 characters" });
  }

  if (email === undefined || email === null || !String(email).trim()) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_REGEX.test(String(email).trim())) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }

  if (addressLine !== undefined && addressLine !== null && String(addressLine).length > 500) {
    errors.push({ field: "addressLine", message: "Address must be at most 500 characters" });
  }

  return { errors };
};

export const updateCarPartnerProfile = async (req, res) => {
  try {
    const partnerId = req.carPartner.id;
    const { firstName, lastName, email, addressLine } = req.body;

    const { errors } = validateProfileUpdate({
      firstName,
      lastName,
      email,
      addressLine,
    });

    if (errors.length) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    const existing = await prisma.carPartner.findUnique({
      where: { id: partnerId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
    const emailVal = String(email).trim();
    const addressVal =
      addressLine === undefined || addressLine === null
        ? null
        : String(addressLine).trim() || null;

    await prisma.carPartner.update({
      where: { id: partnerId },
      data: {
        name: fullName,
        email: emailVal,
        address: addressVal,
      },
    });

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "This phone number is already registered to another account",
      });
    }
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

export const changeCarPartnerPassword = async (req, res) => {
  try {
    const partnerId = req.carPartner.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({
        message: "Validation failed",
        errors: [{ field: "currentPassword", message: "Current password is required" }],
      });
    }

    const pwdErrors = validateNewPassword(newPassword);
    if (pwdErrors.length) {
      return res.status(400).json({
        message: "Validation failed",
        errors: pwdErrors.map((message) => ({ field: "newPassword", message })),
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Validation failed",
        errors: [{ field: "confirmPassword", message: "New password and confirmation do not match" }],
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "Validation failed",
        errors: [{ field: "newPassword", message: "New password must be different from current password" }],
      });
    }

    const partner = await prisma.carPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, password: true },
    });

    if (!partner) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, partner.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect current password",
        errors: [{ field: "currentPassword", message: "Incorrect current password" }],
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.carPartner.update({
      where: { id: partnerId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error changing password",
      error: error.message,
    });
  }
};
