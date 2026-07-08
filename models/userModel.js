import mongoose from "mongoose";

 const userSchema = new mongoose.Schema({
    name: String,

    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
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
    }
},
    {timestamps: true}
);

export const User = mongoose.model("User", userSchema);