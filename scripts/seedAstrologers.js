import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "../models/userModel.js";
import { Worker } from "../models/workerModel.js";
import { Category } from "../models/categoryModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local-service-finder";

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

const astrologersData = [
  {
    name: "Shri Vidya Enterprises",
    phone: "08460427778",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation"],
    experience: 17,
    rating: 4.4,
    totalReviews: 9,
    city: "Thane",
    area: "Srinagar Wagle Estate, Thane West",
    description: "17 Years of Experience. Specializing in Vastu Consultation, Astrological Guidance, and spiritual healing solutions.",
    profileImage: "/uploads/astro-shri-vidya.png"
  },
  {
    name: "Kundali Swar Chikitsa Kendra",
    phone: "08511450199",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Kundali Matching"],
    experience: 46,
    rating: 4.3,
    totalReviews: 4,
    city: "Thane",
    area: "Kopar Road, Dombivli West",
    description: "46 Years of Experience. Expert in Kundali Matching, Vastu, and Jyotish consultations for all life problems.",
    profileImage: "/uploads/astro-kundali-swar.png"
  },
  {
    name: "Maharaj Rohit Ji (Pandit)",
    phone: "08511355834",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation", "Pandit"],
    experience: 16,
    rating: 4.9,
    totalReviews: 91,
    city: "Bhiwandi",
    area: "J K Compound, Kalher",
    description: "16 Years of Experience in Vastu Consultation, Navchandi Yagya, Vedic Puja, and accurate astrological predictions.",
    profileImage: "/uploads/astro-maharaj-rohit.jpg"
  },
  {
    name: "The Urjitta Vibes",
    phone: "08460465239",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Tarot Astrology"],
    experience: 7,
    rating: 5.0,
    totalReviews: 13,
    city: "Navi Mumbai",
    area: "Airoli",
    description: "7 Years of Experience in Tarot Astrology, Chakra Energy Healing, Horoscope Reading, and Vastu Consultancy.",
    profileImage: "/uploads/astro-urjitta-vibes.jpg"
  },
  {
    name: "Pandit Rakesh Mishra Shastri Ji",
    phone: "09972211186",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Kundali Matching", "Pandit"],
    experience: 24,
    rating: 4.8,
    totalReviews: 175,
    city: "Navi Mumbai",
    area: "Sector No 19 Kopar Khairane",
    description: "24 Years of Experience. Specializing in Kundali Matching, Satyanarayan Katha, Vedic Rituals, and Horoscope consultations.",
    profileImage: "/uploads/astro-rakesh-mishra.jpg"
  },
  {
    name: "Achariya Manoj Tiwari",
    phone: "06366968279",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vedic Astrology"],
    experience: 9,
    rating: 4.5,
    totalReviews: 3,
    city: "Thane",
    area: "Kolshet, Thane West",
    description: "9 Years of Experience in Vedic astrology, Horoscope analysis, matchmaking, and personalized spiritual guidance.",
    profileImage: "/uploads/astro-manoj-tiwari.jpg"
  },
  {
    name: "Jai Matadi Astro and Vastu Services",
    phone: "08460232121",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation"],
    experience: 7,
    rating: 4.4,
    totalReviews: 8,
    city: "Palghar",
    area: "Juchandra Road Mahalakshmi Nagar",
    description: "7 Years of Experience in Vastu Consultation, Space Energy Healing, and Astrological remedies.",
    profileImage: "/uploads/astro-jai-matadi.jpg"
  },
  {
    name: "VastuPraapti Astro-Vastu Consultancy",
    phone: "08511483943",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation"],
    experience: 10,
    rating: 5.0,
    totalReviews: 10,
    city: "Thane",
    area: "Kolshet Road, Thane West",
    description: "10 Years of Experience in Vastu Consultation, Kundali Analysis, and tailor-made Astro-Vastu solutions.",
    profileImage: "/uploads/astro-vastu-praapti.jpg"
  },
  {
    name: "PAVITRA -ASTRO VASTU CONSULTANCY",
    phone: "07041664961",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation", "Tarot"],
    experience: 3,
    rating: 5.0,
    totalReviews: 4,
    city: "Mumbai",
    area: "Indira Nagar, Mulund West",
    description: "Scientific and energy-based Vastu consultation, practical remedies, tarot readings, and spiritual guidance.",
    profileImage: "/uploads/astro-pavitra-vastu.jpg"
  },
  {
    name: "Vijayalaxmi Astrolger & Vastu Shastra",
    phone: "08460513317",
    profession: "Astrologer",
    serviceCategories: ["Astrologers", "Vastu Consultation"],
    experience: 16,
    rating: 5.0,
    totalReviews: 27,
    city: "Mumbai",
    area: "Vaishali Nagar, Dahisar East",
    description: "16 Years of Experience in Vastu Shastra, Hawan/Puja rituals, Horoscope matching, and Vedic astrology.",
    profileImage: "/uploads/astro-vijayalaxmi.jpg"
  }
];

const run = async () => {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    // 1. Create or ensure Astrologers category exists
    let cat = await Category.findOne({ slug: "astrologers" });
    if (!cat) {
      cat = await Category.create({
        name: "Astrologers",
        slug: "astrologers",
        icon: "Sparkles"
      });
      console.log("Created category 'Astrologers'");
    } else {
      console.log("Category 'Astrologers' already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash("astro123", salt);

    for (const item of astrologersData) {
      const cleanPhone = item.phone.trim();
      
      // Find or create User
      let user = await User.findOne({ phone: cleanPhone, role: "provider" });
      if (!user) {
        user = await User.create({
          name: item.name,
          phone: cleanPhone,
          password: defaultPassword,
          role: "provider",
          city: item.city,
          area: item.area,
          country: "India"
        });
        console.log(`Created user for ${item.name} (${cleanPhone})`);
      } else {
        user.name = item.name;
        user.city = item.city;
        user.area = item.area;
        await user.save();
        console.log(`Updated existing user for ${item.name} (${cleanPhone})`);
      }

      // Generate SEO slug
      const baseSlug = slugify(item.name);
      const suffix = cleanPhone.slice(-4);
      const slug = `astrologer-${baseSlug}-${suffix}`;

      // Find or create Worker profile
      let worker = await Worker.findOne({ userId: user._id });
      if (!worker) {
        worker = new Worker({
          userId: user._id,
          name: item.name,
          phone: cleanPhone,
          profession: item.profession,
          description: item.description,
          experience: item.experience,
          serviceCategories: item.serviceCategories,
          serviceAreas: [item.area],
          city: item.city,
          area: item.area,
          country: "India",
          rating: item.rating,
          totalReviews: item.totalReviews,
          availability: "Available",
          approved: true,
          slug: slug,
          profileImage: item.profileImage || ""
        });
        await worker.save();
        console.log(`Created Worker profile for ${item.name}`);
      } else {
        worker.name = item.name;
        worker.phone = cleanPhone;
        worker.profession = item.profession;
        worker.description = item.description;
        worker.experience = item.experience;
        worker.serviceCategories = item.serviceCategories;
        worker.serviceAreas = [item.area];
        worker.city = item.city;
        worker.area = item.area;
        worker.country = "India";
        worker.rating = item.rating;
        worker.totalReviews = item.totalReviews;
        worker.availability = "Available";
        worker.approved = true;
        worker.slug = slug;
        if (item.profileImage) {
          worker.profileImage = item.profileImage;
        }
        await worker.save();
        console.log(`Updated Worker profile for ${item.name}`);
      }
    }

    console.log("\nAll 10 Astrologer profiles successfully registered and approved!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding astrologers:", err);
    process.exit(1);
  }
};

run();
