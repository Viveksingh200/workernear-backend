import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";

export const checkUserAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({message: "Token not provided"});
        }

        const token = authHeader?.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: "Your account has been blocked by the admin." });
        }

        req.user = decoded;
        req.user.role = user.role; // ensure fresh role
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            console.warn(`[Auth] Token expired for request: ${req.originalUrl}`);
            return res.status(401).json({
                success: false,
                message: "Token expired",
                code: "TOKEN_EXPIRED"
            });
        }
        console.error(`[Auth] Authentication failed: ${error.message}`);
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Invalid token.",
            code: "INVALID_TOKEN"
        });
    }
}