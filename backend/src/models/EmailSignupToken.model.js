import mongoose from "mongoose";

const EmailSignupTokenSchema = new mongoose.Schema(
    {
        emailNormalized: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        usedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    { timestamps: true },
);

export default mongoose.model("EmailSignupToken", EmailSignupTokenSchema);
