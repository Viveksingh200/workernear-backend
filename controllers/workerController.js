import { Worker } from "../models/workerModel.js";
import { User } from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

// Helper function to slugify names
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// GET all approved workers with filtering, search, and ranking-based sorting
export const getAllWorkers = async (req, res) => {
  try {
    const { category, city, area, rating, search, page = 1, limit = 10 } = req.query;
    const filter = { approved: true };

    if (category) {
      filter.$or = [
        { serviceCategories: { $in: [new RegExp(category, "i")] } },
        { profession: new RegExp(category, "i") }
      ];
    }

    let parsedCity = "";
    let parsedArea = "";

    if (city) {
      if (city.includes(",")) {
        const parts = city.split(",");
        parsedArea = parts[0].trim();
        parsedCity = parts[1].trim();
        filter.city = new RegExp(parsedCity, "i");
      } else {
        parsedCity = city.trim();
        filter.city = new RegExp(parsedCity, "i");
      }
    }

    if (area) {
      parsedArea = area.trim();
    }

    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    if (search) {
      const searchOr = [
        { name: new RegExp(search, "i") },
        { profession: new RegExp(search, "i") },
        { serviceCategories: { $in: [new RegExp(search, "i")] } },
        { city: new RegExp(search, "i") },
        { area: new RegExp(search, "i") }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const pipeline = [
      { $match: filter }
    ];

    if (parsedArea) {
      pipeline.push({
        $addFields: {
          locationScore: {
            $cond: [
              { $regexMatch: { input: "$area", regex: new RegExp(parsedArea, "i") } },
              1000,
              0
            ]
          }
        }
      });
      pipeline.push({
        $sort: { locationScore: -1, rankingScore: -1, rating: -1, totalReviews: -1 }
      });
    } else {
      pipeline.push({
        $sort: { rankingScore: -1, rating: -1, totalReviews: -1 }
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skipIndex }, { $limit: parseInt(limit) }]
      }
    });

    const result = await Worker.aggregate(pipeline);
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const workers = result[0].data;

    return res.status(200).json({
      success: true,
      count: workers.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      workers
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// GET a worker's public profile by SEO slug (safe, masks phone, hides Aadhaar)
export const getWorkerBySlug = async (req, res) => {
  try {
    const worker = await Worker.findOne({ slug: req.params.slug, approved: true });
    if (!worker) {
      return res.status(404).json({ message: "Worker not found or not approved" });
    }

    const workerData = worker.toObject();
    delete workerData.aadhaarNumber; // Always hide Aadhaar



    return res.status(200).json({
      success: true,
      worker: workerData
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// GET a worker profile by ID (protected, reveals phone, increments views)
export const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Increment profile view count if the viewer is not the worker themselves
    if (worker.userId.toString() !== req.user.id) {
      worker.profileViews = (worker.profileViews || 0) + 1;
      await worker.save();
    }

    const workerData = worker.toObject();

    // Hide Aadhaar unless requested by admin or the worker themselves
    if (req.user.role !== "admin" && worker.userId.toString() !== req.user.id) {
      delete workerData.aadhaarNumber;
    }

    return res.status(200).json({
      success: true,
      worker: workerData
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// PUT update worker's professional profile
export const updateWorkerProfile = async (req, res) => {
  try {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ message: "Worker profile not found!" });
    }

    const editableFields = [
      "name",
      "phone",
      "profession",
      "experience",
      "description",
      "serviceCategories",
      "serviceAreas",
      "city",
      "area",
      "country",
      "profileImage"
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        worker[field] = req.body[field];
      }
    });

    if (req.body.name !== undefined || req.body.profession !== undefined) {
      const oldFormatSlug = `${slugify(worker.name)}-${worker.phone.toString().slice(-4)}`;
      if (worker.slug === oldFormatSlug) {
        const nameForSlug = req.body.name || worker.name;
        const professionForSlug = req.body.profession !== undefined ? req.body.profession : worker.profession;
        const baseSlug = slugify(nameForSlug);
        const suffix = worker.phone.toString().slice(-4);
        const professionSlugPart = professionForSlug ? `${slugify(professionForSlug)}-` : "";
        worker.slug = `${professionSlugPart}${baseSlug}-${suffix}`;
      }
    }

    await worker.save();

    // Update corresponding User document to ensure sync (e.g. for Navbar & AuthState)
    const user = await User.findById(req.user.id);
    if (user) {
      if (req.body.name !== undefined) user.name = req.body.name;
      if (req.body.email !== undefined) user.email = req.body.email;
      if (req.body.city !== undefined) user.city = req.body.city;
      if (req.body.area !== undefined) user.area = req.body.area;
      if (req.body.country !== undefined) user.country = req.body.country;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      worker,
      user: user ? {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city || "",
        area: user.area || "",
        country: user.country || ""
      } : null
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// PUT update worker availability status
export const updateWorkerAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    if (!availability || !["Available", "Busy", "Offline"].includes(availability)) {
      return res.status(400).json({ message: "Invalid availability status!" });
    }

    const worker = await Worker.findOne({ userId: req.user.id });
    if (!worker) {
      return res.status(404).json({ message: "Worker profile not found!" });
    }

    worker.availability = availability;
    await worker.save();

    return res.status(200).json({
      success: true,
      message: "Availability status updated successfully",
      availability: worker.availability,
      rankingScore: worker.rankingScore
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// POST upload worker profile image (supports Cloudinary with local storage fallback)
export const uploadProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: "No image data provided" });
    }

    // Expecting base64 image data url (e.g. data:image/png;base64,...)
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: "Invalid image format. Must be base64 data URL." });
    }

    const imageType = matches[1]; // e.g. 'image/png'
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Configure Cloudinary dynamically to avoid ES module top-level import race condition with dotenv
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      // Upload using cloudinary v2 SDK
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "worker_profiles",
        public_id: `avatar-${req.user.id}-${Date.now()}`
      });

      return res.status(200).json({
        success: true,
        message: "Image uploaded to Cloudinary successfully",
        url: uploadResponse.secure_url
      });
    } else {
      // Fallback: save locally
      let extension = "png";
      if (imageType.includes("jpeg") || imageType.includes("jpg")) {
        extension = "jpg";
      } else if (imageType.includes("webp")) {
        extension = "webp";
      } else if (imageType.includes("gif")) {
        extension = "gif";
      }

      const uploadsDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const filename = `avatar-${req.user.id}-${Date.now()}.${extension}`;
      const filePath = path.join(uploadsDir, filename);

      await fs.writeFile(filePath, buffer);
      const fileUrl = `/uploads/${filename}`;

      return res.status(200).json({
        success: true,
        message: "Image uploaded to local storage successfully (Cloudinary not configured)",
        url: fileUrl
      });
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return res.status(500).json({ message: error.message || "Failed to upload image" });
  }
};

