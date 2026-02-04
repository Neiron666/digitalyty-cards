import mongoose from "mongoose";

function parseBoolEnv(value, defaultValue = false) {
    if (typeof value !== "string") return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return defaultValue;
    if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
    return defaultValue;
}

export async function connectDB(mongoUri) {
    if (!mongoUri) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    const autoIndex = parseBoolEnv(process.env.MONGOOSE_AUTO_INDEX, false);
    const autoCreate = parseBoolEnv(process.env.MONGOOSE_AUTO_CREATE, false);

    mongoose.set("autoIndex", autoIndex);
    mongoose.set("autoCreate", autoCreate);

    await mongoose.connect(mongoUri, { autoIndex, autoCreate });
    console.log("MongoDB connected");
}
