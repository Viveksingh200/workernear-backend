import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

// Ensure a user can only review a worker once
reviewSchema.index({ workerId: 1, userId: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
