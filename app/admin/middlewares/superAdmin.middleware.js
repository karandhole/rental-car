import jwt from "jsonwebtoken";

export const superAdminMiddleware = (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (decodedToken.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Only Super Admin can access this route",
      });
    }

    req.admin = decodedToken;

    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};