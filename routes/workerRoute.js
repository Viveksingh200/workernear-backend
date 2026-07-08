import { Router } from "express";
import {
  getAllWorkers,
  getWorkerBySlug,
  getWorkerById,
  updateWorkerProfile,
  updateWorkerAvailability,
  uploadProfileImage
} from "../controllers/workerController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";
import { isProvider } from "../middlewares/roleMiddleware.js";

const router = Router();

// Public routes
router.get("/", getAllWorkers);
router.get("/slug/:slug", getWorkerBySlug);

// Protected routes
router.get("/:id", checkUserAuth, getWorkerById);
router.put("/profile", checkUserAuth, isProvider, updateWorkerProfile);
router.put("/availability", checkUserAuth, isProvider, updateWorkerAvailability);
router.post("/upload-avatar", checkUserAuth, isProvider, uploadProfileImage);

export default router;
