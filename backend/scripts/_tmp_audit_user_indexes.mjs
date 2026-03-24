// Temporary Phase 1 audit helper — READ-ONLY index inspection.
// Superseded by migrate-user-auth-indexes.mjs.
// Safe to delete: del backend\scripts\_tmp_audit_user_indexes.mjs

import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("No MONGO_URI");
    process.exit(1);
}

await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

const db = mongoose.connection.db;
const collections = [
    "users",
    "emailverificationtokens",
    "emailsignuptokens",
    "passwordresets",
];

for (const colName of collections) {
    try {
        const col = db.collection(colName);
        const indexes = await col.indexes();
        console.log("=== " + colName + " ===");
        for (const idx of indexes) {
            const pfe = idx.partialFilterExpression
                ? idx.partialFilterExpression
                : null;
            const coll = idx.collation
                ? {
                      locale: idx.collation.locale,
                      strength: idx.collation.strength,
                  }
                : null;
            console.log(
                JSON.stringify({
                    name: idx.name,
                    key: idx.key,
                    unique: Boolean(idx.unique),
                    sparse: Boolean(idx.sparse),
                    partialFilterExpression: pfe,
                    collation: coll,
                }),
            );
        }
    } catch (e) {
        console.log("=== " + colName + " === ERROR: " + e.message);
    }
}

await mongoose.disconnect();
process.exit(0);
