import "dotenv/config";
import jwt from "jsonwebtoken";
const t = jwt.sign({ id: "698ecb591b54f48162d290bf" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
});
process.stdout.write(t);
