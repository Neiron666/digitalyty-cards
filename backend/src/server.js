import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startTrialCleanupJob } from "./jobs/trialCleanup.js";

const PORT = process.env.PORT || 5000;

async function start() {
    await connectDB(process.env.MONGO_URI);

    // Guaranteed cleanup for expired unpaid trial cards (Mongo + Supabase media).
    startTrialCleanupJob({
        intervalMs:
            Number(process.env.TRIAL_CLEANUP_INTERVAL_MS) || 60 * 60 * 1000,
    });

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
});
