import jwt from "jsonwebtoken";

export const authMiddleware = (req,res,next)=>{
    try {
        const token = req?.headers?.authorization?.split(" ")[1];
        if(!token){
            return res.status(401).json({
                message: "Token is missing"
            });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if(decodedToken.role !== "ADMIN"){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }
        req.admin = decodedToken;
        next();
    } catch (error) {
        res.status(500).json({
            message: error.message,
            error
        });
    }
}