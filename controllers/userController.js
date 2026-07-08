import { User } from "../models/userModel.js";
import { Worker } from "../models/workerModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

export const registerUser = async (req, res) => {
    try {
        const { name, phone, password, role, country } = req.body;

        if(!name || !phone || !password){
            return res.status(400).json({message: "All fields are required!"});
        };

        const existingUser = await User.findOne({phone});
        if(existingUser){
            return res.status(400).json({message: "User with this phone number already exists!"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name: name,
            phone: phone,
            password: hashedPassword,
            role: role || "user",
            city: req.body.city || "",
            area: req.body.area || "",
            country: country || ""
        });

        // If the registering user is a worker/provider, initialize their profile
        if (role === "provider") {
            const baseSlug = slugify(name);
            const suffix = phone.toString().slice(-4);
            const slug = `${baseSlug}-${suffix}`;

            await Worker.create({
                userId: newUser._id,
                name: newUser.name,
                phone: newUser.phone.toString(),
                profession: req.body.profession || "Pending Setup",
                description: req.body.description || "",
                experience: req.body.experience || 0,
                serviceCategories: req.body.serviceCategories || [],
                serviceAreas: req.body.serviceAreas || [],
                city: req.body.city || "Pending",
                area: req.body.area || "Pending",
                country: newUser.country || "",
                slug: slug,
                approved: false
            });
        }

        return res.status(201).json({
            success: true,
            message: "User created successfully!",
            data: {
                newUser
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
};

export const loginUser = async (req, res) => {
    try {
        const {phone, password} = req.body;

        if(!phone || !password){
            return res.status(400).json({message: "All fields are required!"});
        }

        const user = await User.findOne({phone});

        if(!user){
            return res.status(404).json({message: "User not found!"})
        }

        const matchedPassword = await bcrypt.compare(password, user.password);

        if(!matchedPassword){
            return res.status(403).json({message: "Invalid credentials!"});
        }

        const payload = {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m"
        });

        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d"
        });

        let workerProfile = null;
        if (user.role === "provider") {
            workerProfile = await Worker.findOne({ userId: user._id });
        }

        return res.status(200).json({
            success: true,
            message: "User logged in successfully!",
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    city: user.city || "",
                    area: user.area || "",
                    country: user.country || ""
                },
                workerProfile
            }
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        let workerProfile = null;
        if (user.role === "provider") {
            workerProfile = await Worker.findOne({ userId: user._id });
        }

        return res.status(200).json({
            success: true,
            user,
            workerProfile
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { name, city, area, country } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required!" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        user.name = name;
        if (city !== undefined) user.city = city;
        if (area !== undefined) user.area = area;
        if (country !== undefined) user.country = country;
        await user.save();

        // If user is a provider, update name/city/area/country in Worker profile too
        if (user.role === "provider") {
            const worker = await Worker.findOne({ userId: user._id });
            if (worker) {
                worker.name = name;
                if (city !== undefined) worker.city = city;
                if (area !== undefined) worker.area = area;
                if (country !== undefined) worker.country = country;
                await worker.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                city: user.city || "",
                area: user.area || "",
                country: user.country || ""
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required!" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        const matchedPassword = await bcrypt.compare(currentPassword, user.password);
        if (!matchedPassword) {
            return res.status(403).json({ message: "Invalid current password!" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: "Refresh token is required!" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account has been blocked by the admin." });
        }

        // Generate new access token
        const payload = {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m"
        });

        // Generate a new rolling refresh token
        const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d"
        });

        return res.status(200).json({
            success: true,
            accessToken: token,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error("Refresh token verification failed:", error);
        return res.status(401).json({ success: false, message: "Invalid or expired refresh token!" });
    }
};