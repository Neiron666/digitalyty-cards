import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

await connectDB(process.env.MONGO_URI);

const db = mongoose.connection.db;

const collections = [
    "aiusagemonthlies",
    "cardanalyticsdailies",
    "siteanalyticsdailies",
];

for (const name of collections) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
        console.log(`\n${name}: collection does NOT exist`);
        continue;
    }
    const col = db.collection(name);
    const idx = await col.indexes();
    console.log(`\n=== ${name} (${idx.length} indexes) ===`);
    for (const i of idx) {
        console.log(
            JSON.stringify({
                name: i.name,
                key: i.key,
                unique: Boolean(i.unique),
                sparse: Boolean(i.sparse),
                expireAfterSeconds:
                    i.expireAfterSeconds !== undefined
                        ? i.expireAfterSeconds
                        : null,
                partialFilterExpression: i.partialFilterExpression || null,
            }),
        );
    }
}

await mongoose.disconnect();
console.log("\n[audit] done");
