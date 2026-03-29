import mongoose from "mongoose";

// Durable delivery intent carrier for the password-reset outbox.
// Stores userId only — no toEmail snapshot, no rawToken, no resetLink, no tokenHash.
// The worker resolves User.email at send time via indexed findById.
const MailJobSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // pending:    created by /forgot handler; not yet claimed by worker
        // processing: atomically claimed by worker tick; in-flight
        // sent:       worker confirmed Mailjet accepted the message
        // failed:     worker received a definitive delivery failure
        // abandoned:  user was deleted before worker could deliver
        // expired:    expiresAt passed before worker could deliver
        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "sent",
                "failed",
                "abandoned",
                "expired",
            ],
            default: "pending",
            index: true,
        },
        // Number of delivery attempts made by the worker.
        attempts: {
            type: Number,
            default: 0,
        },
        // Timestamp of the most recent worker attempt (null until first attempt).
        lastAttemptAt: {
            type: Date,
            default: null,
        },
        // Mirrors the parent ActivePasswordReset expiresAt.
        // Worker must not attempt delivery after this timestamp.
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);

export default mongoose.model("MailJob", MailJobSchema);
