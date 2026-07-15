import { Router } from "express";
import { loginUser, registerUser, getUserProfile, updateUserProfile, changePassword, refreshAccessToken, forgotPassword, resetPassword } from "../controllers/userController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.get("/me", checkUserAuth, getUserProfile);
router.put("/profile", checkUserAuth, updateUserProfile);
router.put("/change-password", checkUserAuth, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;