import jwt from "jsonwebtoken";

export const generateTokens = (userId,role="USER") => {
  const accessToken = jwt.sign(
    { id: userId,role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  const refreshToken = jwt.sign(
    { id: userId,role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );


  return { accessToken, refreshToken };
};
