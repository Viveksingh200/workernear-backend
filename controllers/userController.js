import { User } from "../models/userModel.js";
import { Worker } from "../models/workerModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendSms } from "../utils/sendSms.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        const { name, email, phone, password, role, country } = req.body;

        const cleanEmail = email ? email.toString().toLowerCase().trim() : undefined;
        const cleanPhone = phone ? phone.toString().trim() : undefined;

        if (!name || (!cleanEmail && !cleanPhone) || !password) {
            return res.status(400).json({ message: "Name, email or phone, and password are required!" });
        }

        const assignedRole = role || "user";

        // Check if an account with this exact email AND role exists
        if (cleanEmail) {
            const existingUserWithEmail = await User.findOne({ email: cleanEmail, role: assignedRole });
            if (existingUserWithEmail) {
                const roleName = assignedRole === "provider" ? "worker" : "customer";
                return res.status(400).json({ message: `You are already registered as a ${roleName} with this email address.` });
            }
        }

        // Check if an account with this exact phone AND role exists
        if (cleanPhone) {
            const existingUserWithPhone = await User.findOne({ phone: cleanPhone, role: assignedRole });
            if (existingUserWithPhone) {
                const roleName = assignedRole === "provider" ? "worker" : "customer";
                return res.status(400).json({ message: `You are already registered as a ${roleName} with this phone number.` });
            }
        }

        // Check if they have another account with this email or phone but a different role
        const orConditions = [];
        if (cleanEmail) orConditions.push({ email: cleanEmail });
        if (cleanPhone) orConditions.push({ phone: cleanPhone });

        const otherRoleAccounts = await User.find({ $or: orConditions });
        for (const account of otherRoleAccounts) {
            const passwordMatches = await bcrypt.compare(password, account.password);
            if (passwordMatches) {
                return res.status(400).json({ message: "You must use a different password for your customer and worker accounts." });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name: name,
            email: cleanEmail || undefined,
            phone: cleanPhone || undefined,
            password: hashedPassword,
            role: assignedRole,
            city: req.body.city || "",
            area: req.body.area || "",
            country: country || ""
        });

        // If the registering user is a worker/provider, initialize their profile
        if (role === "provider") {
            const professionSlug = req.body.profession ? `${slugify(req.body.profession)}-` : "";
            const baseSlug = slugify(name);
            const suffix = (cleanPhone || cleanEmail || Math.floor(1000 + Math.random() * 9000)).toString().slice(-4);
            const slug = `${professionSlug}${baseSlug}-${suffix}`;

            await Worker.create({
                userId: newUser._id,
                name: newUser.name,
                phone: cleanPhone || "",
                profession: req.body.profession || "",
                description: req.body.description || "",
                experience: req.body.experience || 0,
                serviceCategories: req.body.serviceCategories || [],
                serviceAreas: req.body.serviceAreas || [],
                city: req.body.city || "",
                area: req.body.area || "",
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
        res.status(500).json({ message: error.message });
    }
};

const getOrCreateWorkerProfile = async (user) => {
    let workerProfile = await Worker.findOne({ userId: user._id });
    if (!workerProfile) {
        const baseSlug = slugify(user.name || "worker");
        const suffix = (user.phone || user.email || Math.floor(1000 + Math.random() * 9000)).toString().slice(-4);
        const slug = `${baseSlug}-${suffix}`;
        workerProfile = await Worker.create({
            userId: user._id,
            name: user.name,
            phone: user.phone ? user.phone.toString() : "",
            profession: "",
            city: user.city || "",
            area: user.area || "",
            country: user.country || "",
            slug: slug,
            approved: false
        });
    }
    return workerProfile;
};

export const loginUser = async (req, res) => {
    try {
        const { identifier, email, phone, password } = req.body;
        const rawIdentifier = (identifier || email || phone || "").toString().trim();

        if (!rawIdentifier || !password) {
            return res.status(400).json({ message: "Email or phone number and password are required!" });
        }

        const cleanIdentifier = rawIdentifier.toLowerCase();
        const users = await User.find({
            $or: [
                { email: cleanIdentifier },
                { phone: rawIdentifier }
            ]
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "User not found!" });
        }

        let loggedInUser = null;
        for (const u of users) {
            const matchedPassword = await bcrypt.compare(password, u.password);
            if (matchedPassword) {
                loggedInUser = u;
                break;
            }
        }

        if (!loggedInUser) {
            return res.status(403).json({ message: "Invalid credentials!" });
        }

        const user = loggedInUser;

        const payload = {
            id: user._id,
            name: user.name,
            email: user.email || "",
            phone: user.phone || "",
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m"
        });

        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d"
        });

        let workerProfile = null;
        if (user.role === "provider") {
            workerProfile = await getOrCreateWorkerProfile(user);
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
                    email: user.email || "",
                    phone: user.phone || "",
                    role: user.role,
                    city: user.city || "",
                    area: user.area || "",
                    country: user.country || ""
                },
                workerProfile
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
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
            workerProfile = await getOrCreateWorkerProfile(user);
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
        const { name, email, phone, city, area, country } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required!" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // Check if new email is already used by another account with the same role
        if (email !== undefined && email.trim() !== "") {
            const cleanEmail = email.toLowerCase().trim();
            const existingEmailUser = await User.findOne({
                _id: { $ne: user._id },
                email: cleanEmail,
                role: user.role
            });
            if (existingEmailUser) {
                return res.status(400).json({ message: "This email is already linked to another account." });
            }
            user.email = cleanEmail;
        }

        // Check if new phone is already used by another account with the same role
        if (phone !== undefined && phone.trim() !== "") {
            const cleanPhone = phone.trim();
            const existingPhoneUser = await User.findOne({
                _id: { $ne: user._id },
                phone: cleanPhone,
                role: user.role
            });
            if (existingPhoneUser) {
                return res.status(400).json({ message: "This phone number is already linked to another account." });
            }
            user.phone = cleanPhone;
        }

        user.name = name;
        if (city !== undefined) user.city = city;
        if (area !== undefined) user.area = area;
        if (country !== undefined) user.country = country;
        await user.save();

        // If user is a provider, update name/phone/city/area/country in Worker profile too
        if (user.role === "provider") {
            const worker = await Worker.findOne({ userId: user._id });
            if (worker) {
                worker.name = name;
                if (user.phone) worker.phone = user.phone;
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
                email: user.email || "",
                phone: user.phone || "",
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
            email: user.email || "",
            phone: user.phone || "",
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

export const forgotPassword = async (req, res) => {
    try {
        const { identifier, phone, email } = req.body;
        const rawIdentifier = (identifier || email || phone || "").toString().trim();
        if (!rawIdentifier) {
            return res.status(400).json({ message: "Email or phone number is required!" });
        }

        const cleanIdentifier = rawIdentifier.toLowerCase();
        const users = await User.find({
            $or: [
                { email: cleanIdentifier },
                { phone: rawIdentifier }
            ]
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No account found with this email or phone number!" });
        }

        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);

        // Update all users found with the OTP
        for (const user of users) {
            user.resetOtp = hashedOtp;
            user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
            await user.save();
        }

        // If user has a phone, send SMS
        const primaryPhone = users.find(u => u.phone)?.phone;
        if (primaryPhone) {
            await sendSms(primaryPhone, `Your OTP for Local Service Finder password reset is ${otp}. Valid for 10 minutes.`);
        } else {
            console.log(`[RESET OTP] For user ${rawIdentifier}: ${otp}`);
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { identifier, phone, email, otp, newPassword } = req.body;
        const rawIdentifier = (identifier || email || phone || "").toString().trim();
        if (!rawIdentifier || !otp || !newPassword) {
            return res.status(400).json({ message: "Email or phone number, OTP, and new password are required!" });
        }

        const cleanIdentifier = rawIdentifier.toLowerCase();
        const users = await User.find({
            $or: [
                { email: cleanIdentifier },
                { phone: rawIdentifier }
            ]
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No account found with this email or phone number!" });
        }

        const primaryUser = users[0];

        if (!primaryUser.resetOtp || !primaryUser.resetOtpExpiry) {
            return res.status(400).json({ message: "No OTP request found for this account." });
        }

        if (primaryUser.resetOtpExpiry < new Date()) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        const isMatch = await bcrypt.compare(otp, primaryUser.resetOtp);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid OTP!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        for (const user of users) {
            user.password = hashedPassword;
            user.resetOtp = undefined;
            user.resetOtpExpiry = undefined;
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now log in."
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential, accessToken, role } = req.body;
        if (!credential && !accessToken) {
            return res.status(400).json({ message: "Google credential or access token is required!" });
        }

        let payload = null;

        if (accessToken) {
            try {
                const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (response.ok) {
                    payload = await response.json();
                } else {
                    return res.status(400).json({ message: "Failed to fetch user details from Google with access token." });
                }
            } catch (err) {
                return res.status(400).json({ message: "Error contacting Google API: " + err.message });
            }
        } else if (credential) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID || undefined
                });
                payload = ticket.getPayload();
            } catch (verifyErr) {
                const decoded = jwt.decode(credential);
                if (decoded && decoded.email) {
                    payload = decoded;
                } else {
                    return res.status(400).json({ message: "Invalid Google credential: " + verifyErr.message });
                }
            }
        }

        if (!payload || !payload.email) {
            return res.status(400).json({ message: "Could not retrieve email from Google token" });
        }

        const email = payload.email.toLowerCase().trim();
        const name = payload.name || payload.given_name || "User";
        const googleId = payload.sub;
        const avatar = payload.picture || "";
        const assignedRole = role || "user";

        // Find existing user by googleId or email with the requested role
        let user = await User.findOne({
            $or: [
                { googleId, role: assignedRole },
                { email, role: assignedRole }
            ]
        });

        // Smart fallback: If no user found for assignedRole, check if an existing account exists with ANY role (e.g., registered as provider earlier)
        if (!user && (!role || role === "user")) {
            user = await User.findOne({
                $or: [
                    { googleId },
                    { email }
                ]
            });
        }

        if (!user) {
            // Create user
            user = await User.create({
                name,
                email,
                googleId,
                avatar,
                role: assignedRole,
                password: await bcrypt.hash(Math.random().toString(36), 10)
            });

            // If provider, initialize worker profile
            if (assignedRole === "provider") {
                const baseSlug = slugify(name);
                const suffix = Math.floor(1000 + Math.random() * 9000).toString();
                const slug = `${baseSlug}-${suffix}`;
                await Worker.create({
                    userId: user._id,
                    name: user.name,
                    phone: "",
                    profession: "",
                    description: "",
                    experience: 0,
                    serviceCategories: [],
                    serviceAreas: [],
                    city: "",
                    area: "",
                    country: "",
                    slug: slug,
                    approved: false
                });
            }
        } else {
            if (!user.googleId) user.googleId = googleId;
            if (!user.avatar && avatar) user.avatar = avatar;
            await user.save();
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: "Your account has been blocked by the admin." });
        }

        const tokenPayload = {
            id: user._id,
            name: user.name,
            email: user.email || "",
            phone: user.phone || "",
            role: user.role
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: "15m"
        });

        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d"
        });

        let workerProfile = null;
        if (user.role === "provider") {
            workerProfile = await getOrCreateWorkerProfile(user);
        }

        return res.status(200).json({
            success: true,
            message: "Google authentication successful!",
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email || "",
                    phone: user.phone || "",
                    avatar: user.avatar || "",
                    role: user.role,
                    city: user.city || "",
                    area: user.area || "",
                    country: user.country || ""
                },
                workerProfile
            }
        });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};


