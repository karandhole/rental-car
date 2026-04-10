import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const token = req?.headers?.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "Token is missing"
            });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // In the login controller, the token might have the partner details or just ID and role
        // Checking for partner role if applicable, or just verifying it's a valid token for car partner
        // Usually, the role would be "CAR_PARTNER" or similar.
        
        req.carPartner = decodedToken;
        next();
    } catch (error) {
        res.status(500).json({
            message: "Invalid or expired token",
            error: error.message
        });
    }
}
