import {
  requestOTPService,
  verifyOTPService,
} from "../services/auth.service.js";

export const requestOTP = async (req, res) => {
  try {
    const { phoneNum } = req.body;

    if (!phoneNum) {
      return res.status(400).json({ msg: "Phone number required" });
    }

    await requestOTPService(phoneNum);

    return res.status(200).json({
      msg: "OTP sent on WhatsApp",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { phoneNum, otp } = req.body;

    if (!phoneNum || !otp) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const tokens = await verifyOTPService(phoneNum, otp);

    return res.status(200).json({
      msg: "Login successful",
      ...tokens,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};