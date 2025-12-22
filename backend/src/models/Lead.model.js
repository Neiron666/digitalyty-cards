import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
    {
        card: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        message: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
