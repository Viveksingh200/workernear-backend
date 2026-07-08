import { Router } from "express";
import {
  getPendingWorkers,
  approveWorker,
  getApprovedWorkers,
  getAllWorkersAdmin,
  getAllUsersAdmin,
  toggleBlockUser,
  deleteFakeWorker
} from "../controllers/adminController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";

const router = Router();

// Secure admin actions
router.get("/pending-workers", checkUserAuth, isAdmin, getPendingWorkers);
router.patch("/approve/:id", checkUserAuth, isAdmin, approveWorker);
router.get("/approved-workers", checkUserAuth, isAdmin, getApprovedWorkers);
router.get("/workers", checkUserAuth, isAdmin, getAllWorkersAdmin);
router.get("/users", checkUserAuth, isAdmin, getAllUsersAdmin);
router.patch("/block/:id", checkUserAuth, isAdmin, toggleBlockUser);
router.delete("/workers/fake/:id", checkUserAuth, isAdmin, deleteFakeWorker);

export default router;