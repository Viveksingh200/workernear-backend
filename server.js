import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import userRoute from "./routes/userRoute.js";
import adminRoute from "./routes/adminRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import workerRoute from "./routes/workerRoute.js";
import reviewRoute from "./routes/reviewRoute.js";

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/workers", workerRoute);
app.use("/api/reviews", reviewRoute);

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("server is running")
});


app.listen(PORT, () => {
    console.log("app is listening at port 5000");
});

(async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("mongodb connected successfully");
    } catch (error) {
        console.log("connection failed", error);
        process.exit(1);
    }
})()