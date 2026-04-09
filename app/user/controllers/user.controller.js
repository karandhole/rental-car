import prisma from "../../../lib/db.config.js";



export const getUser = async (req, res) => {
  const id = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNum: true,
        firstName: true,
        lastName: true,
        aadhaarPdf: true,
        addressProofPdf: true,
        dlNumber: true,
        dlPdf: true,
        email:true,
        isVerified: true,
        isBlocked: true,
        lastLoginAt: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};



export const updateUser = async (req, res) => {
  const id = req.user.id;
  const body = req.body || {};
  const files = req.files || {};

  const dlFile = files.dlPdf?.[0];
  const aadhaarFile = files.aadhaarPdf?.[0];
  const addressProofFile = files.addressProofPdf?.[0];

  const {
    firstName,
    lastName,
    email,
    aadhaarPdf: aadhaarPdfBody,
    dlPdf: dlPdfBody,
    addressProofPdf: addressProofPdfBody,
    dlNumber,
    address: addressField,
    addressLine,
    country,
    state,
    city,
    pincode,
  } = body;

  let address = addressField;
  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch {
      address = null;
    }
  }
  if (
    (!address || typeof address !== "object") &&
    addressLine !== undefined &&
    country !== undefined &&
    state !== undefined &&
    city !== undefined &&
    pincode !== undefined
  ) {
    address = { addressLine, country, state, city, pincode };
  }

  const aadhaarPdf =
    aadhaarFile?.relativePath ||
    (aadhaarPdfBody && String(aadhaarPdfBody).trim() ? String(aadhaarPdfBody).trim() : undefined);
  const dlPdf =
    dlFile?.relativePath ||
    (dlPdfBody && String(dlPdfBody).trim() ? String(dlPdfBody).trim() : undefined);
  const addressProofPdf =
    addressProofFile?.relativePath ||
    (addressProofPdfBody && String(addressProofPdfBody).trim()
      ? String(addressProofPdfBody).trim()
      : undefined);

  const data = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (email) data.email = email;
  if (aadhaarPdf) data.aadhaarPdf = aadhaarPdf;
  if (addressProofPdf) data.addressProofPdf = addressProofPdf;
  if (dlPdf) data.dlPdf = dlPdf;
  if (Object.prototype.hasOwnProperty.call(body, "dlNumber")) {
    data.dlNumber = dlNumber && String(dlNumber).trim() ? String(dlNumber).trim() : null;
  }
  if (address && typeof address === "object") {
    data.address = {
      addressLine: address.addressLine,
      country: address.country,
      state: address.state,
      city: address.city,
      pincode: address.pincode,
    };
  }

  try {
    if (Object.keys(data).length === 0) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          phoneNum: true,
          firstName: true,
          lastName: true,
          aadhaarPdf: true,
          addressProofPdf: true,
          dlNumber: true,
          dlPdf: true,
          email: true,
          isVerified: true,
          isBlocked: true,
          lastLoginAt: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({
        message: "User updated successfully",
        user,
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};