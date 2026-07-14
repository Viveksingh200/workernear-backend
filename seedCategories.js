import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Note: Ensure this path is correct relative to where you run the script
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define schema directly to avoid import issues with ES modules if running standalone
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: "" }
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

const categories = [
  "Plumber",
  "Electrician",
  "Carpenter",
  "Painter",
  "Cleaning Services",
  "Pest Control",
  "AC Repair",
  "Appliance Repair",
  "Beauty & Makeup",
  "Packers & Movers",
  "Drivers",
  "Tutors",
  "Photographers",
  "Handyman",
  "Gardener",
  "Catering Services",
  "Event Planner"
];

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

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");
        
        for (const catName of categories) {
            const slug = slugify(catName);
            await Category.findOneAndUpdate(
                { slug },
                { name: catName, slug },
                { upsert: true, new: true }
            );
            console.log(`Upserted category: ${catName}`);
        }
        
        console.log("Seeding completed successfully.");
    } catch (error) {
        console.error("Error seeding categories:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
};

seedCategories();
