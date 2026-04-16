// Payment return bridge — Tranzila success/fail browser return.
//
// Tranzila DirectNG delivers the return via an auto-submitted HTML form POST
// to success_url_address / fail_url_address. Netlify's SPA rewrite does not
// handle POST requests, so a dedicated function is required.
//
// This function is a pure UX bridge:
//   - Reads ONLY the ?status= query param.
//   - Does NOT read, parse, or log the request body.
//   - Does NOT call backend.
//   - Does NOT persist anything.
//   - Does NOT verify payment legitimacy.
//   - Does NOT inspect payment fields.
//
// Payment legitimacy and fulfillment live exclusively in the notify contour
// (payment-notify.js → backend handleNotify). This function has no role there.
//
// Redirect targets are hardcoded — no open redirect surface is possible.

exports.handler = async function handler(event) {
    const qs = event && event.queryStringParameters;
    const raw = qs && typeof qs.status === "string" ? qs.status : "";

    // Strict whitelist. Any value other than "success" maps to fail.
    const dest =
        raw === "success"
            ? "/pricing?payment=success"
            : "/pricing?payment=fail";

    // HTTP 303 See Other: correct semantics for POST → GET redirect.
    // RFC 7231 §6.4.4: after 303, user agent MUST use GET for the redirect.
    // Cache-Control: no-store prevents CDN/browser caching of this redirect.
    return {
        statusCode: 303,
        headers: {
            Location: dest,
            "Cache-Control": "no-store",
        },
        body: "",
    };
};
