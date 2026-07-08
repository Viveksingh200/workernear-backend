import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },

    profession: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    experience: {
      type: Number,
      default: 0
    },
    profileImage: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    area: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: "",
      trim: true
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    availability: {
      type: String,
      enum: ["Available", "Busy", "Offline"],
      default: "Available"
    },
    approved: {
      type: Boolean,
      default: false
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    aadhaarNumber: {
      type: String,
      default: ""
    },
    profileViews: {
      type: Number,
      default: 0
    },
    profileCompletion: {
      type: Number,
      default: 0
    },
    rankingScore: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// MongoDB indexes for efficient searching
workerSchema.index({ profession: "text", city: "text", area: "text" });
workerSchema.index({ city: 1, area: 1 });
workerSchema.index({ rankingScore: -1, rating: -1, totalReviews: -1 });

// Method to calculate profile completion percentage
workerSchema.methods.calculateCompletion = function () {
  const fields = [
    "name",
    "phone",
    "profession",
    "description",
    "experience",
    "city",
    "area",
    "country",
    "profileImage"
  ];
  let filledFields = 0;
  fields.forEach((field) => {
    if (this[field] !== undefined && this[field] !== null && this[field].toString().trim() !== "") {
      filledFields++;
    }
  });
  return Math.round((filledFields / fields.length) * 100);
};

// Method to calculate the ranking score
workerSchema.methods.calculateRanking = function () {
  let score = 0;

  // 1. Availability (Max 100 points)
  if (this.availability === "Available") score += 100;
  else if (this.availability === "Busy") score += 50;

  // 2. Average Rating (Max 250 points, e.g. 5.0 * 50 = 250)
  score += (this.rating || 0) * 50;

  // 3. Number of Reviews (Max 100 points, capped at 50 reviews * 2)
  score += Math.min((this.totalReviews || 0) * 2, 100);

  // 4. Profile Completion (Max 100 points)
  score += this.profileCompletion || 0;

  return score;
};

// Pre-save middleware to update completion and ranking scores
workerSchema.pre("save", function () {
  this.profileCompletion = this.calculateCompletion();
  this.rankingScore = this.calculateRanking();
});

export const Worker = mongoose.model("Worker", workerSchema);
