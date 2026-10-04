import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        default: undefined
    },
    phone: {
        type: String,
        trim: true,
        default: undefined
    },
    googleId: {
        type: String,
        default: undefined
    },
    avatar: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "admin", "provider"],
        default: "user",
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    city: {
        type: String,
        default: ""
    },
    area: {
        type: String,
        default: ""
    },
    country: {
        type: String,
        default: ""
    },
    resetOtp: {
        type: String,
        default: ""
    },
    resetOtpExpiry: {
        type: Date
    }
},
    { timestamps: true }
);

// Partial unique indexes so users with only email or only phone or googleId can coexist without collision
userSchema.index(
    { phone: 1, role: 1 },
    { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } }
);

userSchema.index(
    { email: 1, role: 1 },
    { unique: true, partialFilterExpression: { email: { $type: "string", $gt: "" } } }
);

userSchema.index(
    { googleId: 1, role: 1 },
    { unique: true, partialFilterExpression: { googleId: { $type: "string", $gt: "" } } }
);

export const User = mongoose.model("User", userSchema);