import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

await connectDB(process.env.MONGO_URI);
const db = mongoose.connection.db;

const collections = [
    "orginvites",
    "orginviteaudits",
    // Step 1 collections — include for completeness of token audit
    "emailverificationtokens",
    "emailsignuptokens",
    "passwordresets",
];

for (const name of collections) {
    console.log("=== " + name + " ===");
    try {
        const indexes = await db.collection(name).indexes();
        for (const idx of indexes) {
            console.log(
                JSON.stringify({
                    name: idx.name,
                    key: idx.key,
                    unique: Boolean(idx.unique),
                    sparse: Boolean(idx.sparse),
                    partialFilterExpression:
                        idx.partialFilterExpression || null,
                    expireAfterSeconds:
                        idx.expireAfterSeconds !== undefined
                            ? idx.expireAfterSeconds
                            : null,
                }),
            );
        }
    } catch (e) {
        console.log("ERROR: " + e.message);
    }
}

await mongoose.disconnect();
process.exit(0);
