import multer from "multer";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error("Only JPG/PNG/WebP files are allowed");
    // treated as a multer error by our handler
    err.code = "LIMIT_FILE_TYPE";
    return cb(err, false);
};

export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // ✅ 2MB ЖЁСТКИЙ ЛИМИТ
    },
});
