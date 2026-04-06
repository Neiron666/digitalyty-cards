import mongoose from "mongoose";

const DeletedEmailBlockSchema = new mongoose.Schema(
    {
        emailKey: {
            type: String,
            required: true,
            unique: true,
        },
        formerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        // No updatedAt - tombstones are write-once.
        timestamps: false,
    },
);

export default mongoose.model("DeletedEmailBlock", DeletedEmailBlockSchema);
