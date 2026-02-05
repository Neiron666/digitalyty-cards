export function errorMiddleware(err, req, res, next) {
    console.error(err);

    const status = err.statusCode || 500;
    const isProd =
        String(process.env.NODE_ENV || "")
            .trim()
            .toLowerCase() === "production";
    res.status(status).json({
        message: isProd ? "Server error" : err.message || "Server error",
    });
}
