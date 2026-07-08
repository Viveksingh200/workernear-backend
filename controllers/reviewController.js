import { Review } from "../models/reviewModel.js";
import { Worker } from "../models/workerModel.js";

// POST submit a review for a worker
export const createReview = async (req, res) => {
  try {
    const { workerId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!workerId || !rating) {
      return res.status(400).json({ message: "Worker ID and rating are required!" });
    }

    const numericRating = parseInt(rating);
    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5!" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker profile not found!" });
    }

    // Prevent workers from reviewing themselves
    if (worker.userId.toString() === userId) {
      return res.status(400).json({ message: "You cannot review your own profile!" });
    }

    // Prevent duplicate reviews
    const existingReview = await Review.findOne({ workerId, userId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this worker!" });
    }

    const review = await Review.create({
      workerId,
      userId,
      rating: numericRating,
      comment: comment || ""
    });

    // Fetch all reviews to recalculate average rating and review counts
    const reviews = await Review.find({ workerId });
    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    // Save average rating rounded to 1 decimal place and trigger pre-save hooks
    worker.rating = Math.round(avgRating * 10) / 10;
    worker.totalReviews = totalReviews;
    await worker.save();

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      review,
      workerRating: worker.rating,
      workerReviewsCount: worker.totalReviews,
      rankingScore: worker.rankingScore
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// GET reviews for a worker (paginated)
export const getWorkerReviews = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const reviews = await Review.find({ workerId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ workerId });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      reviews
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// DELETE a review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found!" });
    }

    // Verify ownership or admin privilege
    if (review.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not authorized to delete this review!" });
    }

    const workerId = review.workerId;
    await Review.findByIdAndDelete(id);

    // Fetch remaining reviews to recalculate average rating and review counts
    const reviews = await Review.find({ workerId });
    const totalReviews = reviews.length;
    
    let avgRating = 0;
    if (totalReviews > 0) {
      avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    }

    const worker = await Worker.findById(workerId);
    if (worker) {
      worker.rating = totalReviews > 0 ? Math.round(avgRating * 10) / 10 : 0;
      worker.totalReviews = totalReviews;
      await worker.save(); // triggers pre-save hooks to update rankingScore
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully!",
      workerRating: worker ? worker.rating : 0,
      workerReviewsCount: worker ? worker.totalReviews : 0
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
