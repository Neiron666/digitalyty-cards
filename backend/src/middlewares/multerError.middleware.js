import { MAX_UPLOAD_BYTES } from "../utils/imagePolicy.js";

const _maxMB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export function multerErrorHandler(err, req, res, next) {
    // Helpful logging for Cloudinary/multer issues
    try {
        console.error("Upload middleware error:", {
            code: err?.code,
            name: err?.name,
            message: err?.message,
        });
    } catch {
        // ignore
    }

    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            message: `File is too large (max ${_maxMB}MB)`,
        });
    }

    // CloudinaryStorage may throw nested errors
    const message =
        err?.message ||
        err?.error?.message ||
        err?.error?.error?.message ||
        (typeof err === "string" ? err : null) ||
        "Upload error";

    res.status(400).json({
        message,
    });
}
