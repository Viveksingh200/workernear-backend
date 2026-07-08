import { Router } from "express";
import { createReview, getWorkerReviews, deleteReview } from "../controllers/reviewController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Submit a review (Protected)
router.post("/create", checkUserAuth, createReview);

// Fetch reviews for a specific worker (Public)
router.get("/worker/:workerId", getWorkerReviews);

// Delete a review (Protected)
router.delete("/:id", checkUserAuth, deleteReview);

export default router;
