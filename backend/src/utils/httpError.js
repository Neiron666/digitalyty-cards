export class HttpError extends Error {
    constructor(statusCode, message, code = undefined) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
