import { Router } from "express";
import { loginUser, registerUser, getUserProfile, updateUserProfile, changePassword, refreshAccessToken } from "../controllers/userController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.get("/me", checkUserAuth, getUserProfile);
router.put("/profile", checkUserAuth, updateUserProfile);
router.put("/change-password", checkUserAuth, changePassword);

export default router;