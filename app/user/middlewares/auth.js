import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const token = authHeader.split(" ")[1];
    console.log(process.env.JWT_SECRET)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );


    console.log(decoded)

    // attach user to request
    req.user = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    console.log(error.message)
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
};