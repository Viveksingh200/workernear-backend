import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "./models/userModel.js";
import { Worker } from "./models/workerModel.js";
import { Category } from "./models/categoryModel.js";
import { Review } from "./models/reviewModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

const seedDatabase = async () => {
  try {
    console.log("Connecting to database...", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully. Clearing old collections...");

    await User.deleteMany({});
    await Worker.deleteMany({});
    await Category.deleteMany({});
    await Review.deleteMany({});

    console.log("Cleared databases. Creating Admin account...");
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    const clientPassword = await bcrypt.hash("user123", salt);
    const workerPassword = await bcrypt.hash("worker123", salt);

    // 1. Create Users
    const admin = await User.create({
      name: "System Admin",
      phone: 9999999999, // User model has Number
      password: adminPassword,
      role: "admin"
    });

    const client1 = await User.create({
      name: "Rohan Sharma",
      phone: 8888888888,
      password: clientPassword,
      role: "user"
    });

    const client2 = await User.create({
      name: "Priya Patel",
      phone: 7777777777,
      password: clientPassword,
      role: "user"
    });

    // Worker Users
    const wUserA = await User.create({
      name: "Amit Kumar (Plumber A)",
      phone: 9111111111,
      password: workerPassword,
      role: "provider"
    });

    const wUserB = await User.create({
      name: "Vijay Singh (Plumber B)",
      phone: 9222222222,
      password: workerPassword,
      role: "provider"
    });

    const wUserC = await User.create({
      name: "Suresh Gupta (Electrician C)",
      phone: 9333333333,
      password: workerPassword,
      role: "provider"
    });

    console.log("Users created. Creating categories...");

    // 2. Create Categories
    const plumberCat = await Category.create({ name: "Plumbing", slug: "plumbing", icon: "Wrench" });
    const electricianCat = await Category.create({ name: "Electrical", slug: "electrical", icon: "Zap" });
    await Category.create({ name: "AC Repair", slug: "ac-repair", icon: "Snowflake" });
    await Category.create({ name: "Appliance Repair", slug: "appliance-repair", icon: "WashingMachine" });
    await Category.create({ name: "House Cleaning", slug: "house-cleaning", icon: "Sparkles" });

    console.log("Categories created. Creating worker profiles...");

    // 3. Create Workers
    // Worker A: Rating 4.9, 12 reviews, Available, Approved
    const workerA = await Worker.create({
      userId: wUserA._id,
      name: wUserA.name,
      phone: wUserA.phone.toString(),
      profession: "Plumber",
      experience: 8,
      description: "Expert plumbing services. Available for leakage fixes, tap installations, and drainage repairs.",
      serviceCategories: ["Plumbing"],
      serviceAreas: ["Belapur", "Seawoods", "Nerul"],
      city: "Mumbai",
      area: "Belapur",
      rating: 4.9,
      totalReviews: 12,
      availability: "Available",
      approved: true,
      slug: "amit-kumar-plumber-9111",
      aadhaarNumber: "123456789012",
      profileImage: "/professionals/alex.png"
    });

    // Worker B: Rating 4.9, 2 reviews, Available, Approved
    const workerB = await Worker.create({
      userId: wUserB._id,
      name: wUserB.name,
      phone: wUserB.phone.toString(),
      profession: "Plumber",
      experience: 4,
      description: "Affordable plumbing repairs. Quick support in Nerul and Kharghar.",
      serviceCategories: ["Plumbing"],
      serviceAreas: ["Nerul", "Kharghar"],
      city: "Mumbai",
      area: "Nerul",
      rating: 4.9,
      totalReviews: 2,
      availability: "Available",
      approved: true,
      slug: "vijay-singh-plumber-9222",
      aadhaarNumber: "234567890123",
      profileImage: "/professionals/michael.png"
    });

    // Worker C: Rating 4.0, 1 review, Offline, Approved
    const workerC = await Worker.create({
      userId: wUserC._id,
      name: wUserC.name,
      phone: wUserC.phone.toString(),
      profession: "Electrician",
      experience: 6,
      description: "Certified residential electrician. Specializing in home wiring and appliance setup.",
      serviceCategories: ["Electrical"],
      serviceAreas: ["Belapur"],
      city: "Mumbai",
      area: "Belapur",
      rating: 4.0,
      totalReviews: 1,
      availability: "Offline",
      approved: true,
      slug: "suresh-gupta-electrician-9333",
      aadhaarNumber: "345678901234",
      profileImage: "/professionals/david.png"
    });

    // Worker D: Pending approval worker
    const wUserD = await User.create({
      name: "Deepak Rawat (Pending Worker)",
      phone: 9444444444,
      password: workerPassword,
      role: "provider"
    });

    await Worker.create({
      userId: wUserD._id,
      name: wUserD.name,
      phone: wUserD.phone.toString(),
      profession: "AC Repair",
      experience: 5,
      description: "AC installation and cooling solutions service provider.",
      serviceCategories: ["AC Repair"],
      serviceAreas: ["Vashi"],
      city: "Navi Mumbai",
      area: "Vashi",
      rating: 0,
      totalReviews: 0,
      availability: "Available",
      approved: false,
      slug: "deepak-rawat-ac-repair-9444",
      aadhaarNumber: "456789012345",
      profileImage: "/professionals/sarah.png"
    });

    console.log("Worker profiles created. Seeding sample reviews...");

    // 4. Create Reviews
    // Reviews for Worker A
    await Review.create({
      workerId: workerA._id,
      userId: client1._id,
      rating: 5,
      comment: "Excellent plumber! Clean and quick work."
    });
    await Review.create({
      workerId: workerA._id,
      userId: client2._id,
      rating: 5,
      comment: "Very polite, fixed our kitchen tap in no time."
    });

    // Review for Worker B
    await Review.create({
      workerId: workerB._id,
      userId: client1._id,
      rating: 5,
      comment: "Satisfied with the service."
    });

    // Review for Worker C
    await Review.create({
      workerId: workerC._id,
      userId: client2._id,
      rating: 4,
      comment: "Good electrician, but was late by 30 mins."
    });

    // Explicitly recalculate scores & trigger hooks to set correct profileCompletion & rankingScore
    const allSecWorkers = await Worker.find({});
    for (const w of allSecWorkers) {
      await w.save();
    }

    console.log("Database seeded successfully!");
    console.log("\nTest credentials:");
    console.log("-------------------");
    console.log("Admin: phone: 9999999999, password: admin123");
    console.log("User/Client: phone: 8888888888, password: user123");
    console.log("Worker A: phone: 9111111111, password: worker123");
    console.log("Worker D (Pending): phone: 9444444444, password: worker123");
    console.log("\nSeeding finished!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedDatabase();
