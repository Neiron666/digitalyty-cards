export function errorMiddleware(err, req, res, next) {
    console.error(err);

    const isProd =
        String(process.env.NODE_ENV || "")
            .trim()
            .toLowerCase() === "production";

    // Production-safe mapping for common user-input errors.
    // Do not leak values; include only stable codes + field paths.
    if (isProd) {
        if (err?.name === "ValidationError") {
            const fields = Object.keys(err?.errors || {}).filter(Boolean);
            fields.sort();
            return res.status(422).json({
                ok: false,
                code: "VALIDATION_ERROR",
                message: "Invalid data",
                fields,
            });
        }

        if (err?.name === "CastError") {
            return res.status(400).json({
                ok: false,
                code: "INVALID_ID",
                message: "Invalid id",
            });
        }
    }

    const status = err.statusCode || 500;
    res.status(status).json({
        message: isProd ? "Server error" : err.message || "Server error",
    });
}
