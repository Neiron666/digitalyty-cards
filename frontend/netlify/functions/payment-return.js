// Payment return bridge — Tranzila success/fail browser return.
//
// Tranzila DirectNG delivers the return via an auto-submitted HTML form POST
// to success_url_address / fail_url_address. Netlify's SPA rewrite does not
// handle POST requests, so a dedicated function is required.
//
// This function is a pure UX bridge:
//   - Reads ONLY the ?status= and ?target= query params.
//   - Does NOT read, parse, or log the request body.
//   - Does NOT call backend.
//   - Does NOT persist anything.
//   - Does NOT verify payment legitimacy.
//   - Does NOT inspect payment fields.
//
// Payment legitimacy and fulfillment live exclusively in the notify contour
// (payment-notify.js → backend handleNotify). This function has no role there.
//
// Redirect targets are hardcoded strings derived from allowlisted params only.
// No open redirect is possible — arbitrary URL values are never accepted.
//
// Routing:
//   ?status=success              -> 303 /pricing?payment=success          (external flow)
//   ?status=fail                 -> 303 /pricing?payment=fail             (external flow)
//   ?status=success&target=iframe -> 303 /payment/iframe-return?status=success  (iframe relay)
//   ?status=fail&target=iframe    -> 303 /payment/iframe-return?status=fail     (iframe relay)

exports.handler = async function handler(event) {
    const qs = event && event.queryStringParameters;

    // status allowlist: only "success" is accepted; everything else maps to "fail".
    const status = qs && qs.status === "success" ? "success" : "fail";

    // target allowlist: only "iframe" is recognized; absent or any other value
    // routes to the external (pricing) flow. No arbitrary URLs are accepted.
    const target = qs && typeof qs.target === "string" ? qs.target : "";

    const dest =
        target === "iframe"
            ? `/payment/iframe-return?status=${status}`
            : `/pricing?payment=${status}`;

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
