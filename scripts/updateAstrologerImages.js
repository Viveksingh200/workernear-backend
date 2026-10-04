import mongoose from "mongoose";
import dotenv from "dotenv";
import { Worker } from "../models/workerModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

const updates = [
  {
    phone: "08460427778",
    image: "/uploads/astro-shri-vidya.png"
  },
  {
    phone: "08511450199",
    image: "/uploads/astro-kundali-swar.png"
  },
  {
    phone: "08511355834",
    image: "/uploads/astro-maharaj-rohit.jpg"
  },
  {
    phone: "08460465239",
    image: "/uploads/astro-urjitta-vibes.jpg"
  },
  {
    phone: "09972211186",
    image: "/uploads/astro-rakesh-mishra.jpg"
  },
  {
    phone: "06366968279",
    image: "/uploads/astro-manoj-tiwari.jpg"
  },
  {
    phone: "08460232121",
    image: "/uploads/astro-jai-matadi.jpg"
  },
  {
    phone: "08511483943",
    image: "/uploads/astro-vastu-praapti.jpg"
  },
  {
    phone: "07041664961",
    image: "/uploads/astro-pavitra-vastu.jpg"
  },
  {
    phone: "08460513317",
    image: "/uploads/astro-vijayalaxmi.jpg"
  }
];

import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const updateImages = async () => {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    for (const u of updates) {
      const worker = await Worker.findOne({ phone: u.phone });
      if (worker) {
        // Find local file in frontend/public/uploads
        const localFilePath = path.join(process.cwd(), "..", "frontend", "public", u.image.replace(/^\//, ""));

        if (fs.existsSync(localFilePath)) {
          console.log(`Uploading ${u.image} to Cloudinary...`);
          const uploadRes = await cloudinary.uploader.upload(localFilePath, {
            folder: "worker_profiles",
            public_id: `avatar-astro-${worker._id}-${Date.now()}`
          });
          worker.profileImage = uploadRes.secure_url;
          await worker.save();
          console.log(`Uploaded to Cloudinary & updated in MongoDB for ${worker.name} (${worker.phone}) -> ${uploadRes.secure_url}`);
        } else {
          // If file not found locally, just save the url path
          worker.profileImage = u.image;
          await worker.save();
          console.log(`Local file not found, saved path for ${worker.name} -> ${u.image}`);
        }
      } else {
        console.log(`Worker with phone ${u.phone} not found.`);
      }
    }

    console.log("\nAll profile photos successfully uploaded to Cloudinary and updated in MongoDB!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating profile photos:", err);
    process.exit(1);
  }
};

updateImages();
