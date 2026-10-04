import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

const fixIndexes = async () => {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    const usersCol = mongoose.connection.collection("users");
    const existing = await usersCol.indexes();
    console.log("Current indexes before fix:", existing.map(i => i.name));

    if (existing.some(i => i.name === "phone_1_role_1")) {
      console.log("Dropping old phone_1_role_1 index...");
      await usersCol.dropIndex("phone_1_role_1");
      console.log("Dropped phone_1_role_1.");
    }

    console.log("Creating new partial unique index for phone_1_role_1...");
    await usersCol.createIndex(
      { phone: 1, role: 1 },
      { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } }
    );
    console.log("Created phone_1_role_1 partial index!");

    const updated = await usersCol.indexes();
    console.log("\nUpdated indexes in database:");
    console.log(JSON.stringify(updated, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error fixing indexes:", err);
    process.exit(1);
  }
};

fixIndexes();
