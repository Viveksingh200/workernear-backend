import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

const workerSchema = new mongoose.Schema({}, { strict: false });
const Worker = mongoose.models.Worker || mongoose.model('Worker', workerSchema, 'workers');

async function run() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    const worker = await Worker.findOne({ name: /Amit/ });
    if (worker) {
      console.log("Raw worker document:", JSON.stringify(worker.toObject(), null, 2));
    } else {
      console.log("Worker not found");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
