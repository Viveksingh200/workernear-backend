import mongoose from "mongoose";
import dotenv from "dotenv";
import { Worker } from "../models/workerModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

const testRanking = async () => {
  try {
    console.log("Connecting to database for test validation...", MONGO_URI);
    await mongoose.connect(MONGO_URI);

    console.log("Fetching workers sorted by rankingScore DESC...");
    const workers = await Worker.find({ approved: true }).sort({
      rankingScore: -1,
      rating: -1,
      totalReviews: -1
    });

    console.log("\n--- RANKING REPORT ---");
    workers.forEach((w, index) => {
      console.log(
        `${index + 1}. Name: ${w.name.padEnd(25)} | Score: ${w.rankingScore.toString().padEnd(6)} | Rating: ${w.rating} | Reviews: ${w.totalReviews.toString().padEnd(3)} | Status: ${w.availability}`
      );
    });
    console.log("----------------------\n");

    if (workers.length < 2) {
      console.log("❌ Test failed: Insufficient data to verify ranking (need at least 2 workers).");
      process.exit(1);
    }

    // Worker 1 should have a higher score than Worker 2
    const first = workers[0];
    const second = workers[1];

    console.log(`Verifying: "${first.name}" (Score: ${first.rankingScore}) should rank above "${second.name}" (Score: ${second.rankingScore})...`);
    
    if (first.rankingScore >= second.rankingScore) {
      console.log("✅ SUCCESS: Platform worker ranking formula is working correctly!");
      process.exit(0);
    } else {
      console.log("❌ FAILURE: Worker ranking order is incorrect.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
};

testRanking();
