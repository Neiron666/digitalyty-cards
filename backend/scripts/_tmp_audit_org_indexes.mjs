/**
 * READ-ONLY audit: inspect live indexes on `organizations` and `organizationmembers` collections.
 * No mutations. Safe to run on any env.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

await connectDB(process.env.MONGO_URI);

const db = mongoose.connection.db;
const colls = ["organizations", "organizationmembers"];

for (const name of colls) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
        console.log(`[${name}] collection does NOT exist`);
        continue;
    }
    const indexes = await db.collection(name).indexes();
    console.log(`\n=== ${name} (${indexes.length} indexes) ===`);
    for (const idx of indexes) {
        console.log(
            JSON.stringify({
                name: idx.name,
                key: idx.key,
                unique: Boolean(idx.unique),
                sparse: Boolean(idx.sparse),
                partialFilterExpression: idx.partialFilterExpression || null,
            }),
        );
    }
}

await mongoose.disconnect();
console.log("\n[audit] done");
