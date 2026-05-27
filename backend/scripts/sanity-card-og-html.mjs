/**
 * Phase 2B2 fixture-only sanity for cardOgHtml.service.js.
 * No DB, no Express, no env, no network, no filesystem. Imports the service
 * directly and asserts on the returned HTML string.
 */
import { renderCardOgHtml } from "../src/services/cardOgHtml.service.js";

const HTTPS_BASE = "https://cardigo.co.il";

let total = 0;
let failed = 0;

function assert(cond, label) {
    total++;
    if (cond) {
        console.log("PASS  " + label);
    } else {
        failed++;
        console.log("FAIL  " + label);
    }
}

function assertThrowsTypeError(fn, label) {
    total++;
    try {
        fn();
        failed++;
        console.log("FAIL  " + label + " — did not throw");
    } catch (e) {
        if (e instanceof TypeError) {
            console.log("PASS  " + label + " — TypeError: " + e.message);
        } else {
            failed++;
            console.log("FAIL  " + label + " — wrong error: " + (e && e.name));
        }
    }
}

function baseSeo(over) {
    return Object.assign(
        {
            canonicalUrl: HTTPS_BASE + "/card/demo",
            ogUrl: HTTPS_BASE + "/card/demo",
            title: "Demo Title",
            description: "Demo description.",
            robotsResolved: "index, follow",
            indexable: true,
            ogImage: HTTPS_BASE + "/img.jpg",
            ogImageAlt: "Demo alt",
            ogType: "website",
            twitterCard: "summary_large_image",
            jsonLdItems: [
                {
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    name: "Demo",
                },
            ],
        },
        over || {},
    );
}

function baseRender(over) {
    return Object.assign(
        {
            displayName: "Demo Biz",
            subtitle: "Plumbing",
            slogan: "We fix pipes.",
            aboutText: "Para one.\n\nPara two.",
            aboutParagraphs: ["Para one.", "Para two."],
            contactLinks: {
                phone: "050-1234567",
                email: "a@b.co",
                website: "https://example.com",
                whatsapp: "https://wa.me/972501234567",
            },
            services: [{ title: "Service A", description: "Desc A" }],
            faqItems: [{ question: "Q1", answer: "A1" }],
            businessHours: {
                enabled: true,
                week: {
                    sun: { open: false, intervals: [] },
                    mon: {
                        open: true,
                        intervals: [{ start: "09:00", end: "17:00" }],
                    },
                    tue: { open: false, intervals: [] },
                    wed: { open: false, intervals: [] },
                    thu: { open: false, intervals: [] },
                    fri: { open: false, intervals: [] },
                    sat: { open: false, intervals: [] },
                },
            },
            gallery: [
                {
                    url: "https://cdn.example.com/a.jpg",
                    alt: "Image A",
                    width: 800,
                    height: 600,
                },
            ],
            socialLinks: { instagram: "https://instagram.com/demo" },
        },
        over || {},
    );
}

/* ───────── F1 happy path ───────── */
{
    const out = renderCardOgHtml({ seo: baseSeo(), render: baseRender() });
    assert(out.startsWith("<!doctype html>\n"), "F1 doctype");
    assert(/<html lang="he" dir="rtl">/.test(out), "F1 html lang/dir");
    assert(/<title>Demo Title<\/title>/.test(out), "F1 title");
    assert(
        /<link rel="canonical" href="https:\/\/cardigo\.co\.il\/card\/demo">/.test(
            out,
        ),
        "F1 canonical",
    );
    assert(
        /<meta name="robots" content="index, follow">/.test(out),
        "F1 robots",
    );
    assert(
        /<meta property="og:url" content="https:\/\/cardigo\.co\.il\/card\/demo">/.test(
            out,
        ),
        "F1 og:url",
    );
    assert(
        /<meta name="twitter:card" content="summary_large_image">/.test(out),
        "F1 twitter:card",
    );
    assert(/<h1>Demo Biz<\/h1>/.test(out), "F1 H1");
    assert(out.includes("Para one."), "F1 about text");
    assert(out.includes("Service A"), "F1 service text");
    assert(out.includes("Q1") && out.includes("A1"), "F1 FAQ text");
    assert(/href="tel:050-1234567"/.test(out), "F1 tel link");
    assert(
        /<script type="application\/ld\+json">/.test(out),
        "F1 JSON-LD script",
    );
}

/* ───────── F2 escaping ───────── */
{
    const seo = baseSeo({
        title: 'Quote " here',
        ogImageAlt: 'alt with "',
        jsonLdItems: [
            {
                "@type": "Test",
                note: "</script><!--\u2028\u2029",
            },
        ],
    });
    const render = baseRender({
        displayName: "<script>alert(1)</script>",
    });
    const out = renderCardOgHtml({ seo, render });
    assert(
        /<h1>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/h1>/.test(out),
        "F2 H1 script tag escaped",
    );
    assert(out.includes("Quote &quot; here"), "F2 attribute quote escaped");
    assert(out.includes("<\\/script"), "F2 JSON-LD </script escaped");
    assert(out.includes("<\\!--"), "F2 JSON-LD <!-- escaped");
    assert(out.includes("\\u2028"), "F2 JSON-LD U+2028 escaped");
    assert(out.includes("\\u2029"), "F2 JSON-LD U+2029 escaped");
    // The raw </script literal must NOT survive (case-insensitive guard).
    assert(
        !/<\/script(?!\s*application)/i.test(
            out.replace(/<\/script>/g, ""), // strip legitimate JSON-LD closer
        ),
        "F2 no raw </script payload survives outside JSON-LD closer",
    );
}

/* ───────── F3 URL safety ───────── */
{
    const render = baseRender({
        contactLinks: {
            phone: "050",
            website: "http://insecure.example.com",
            whatsapp: "javascript:alert(1)",
            email: "ok@x.co",
        },
        gallery: [
            { url: "data:image/png;base64,xxx", alt: "bad" },
            { url: "http://bad.example.com/img.jpg", alt: "bad2" },
            { url: "ftp://bad.example.com/img.jpg", alt: "bad3" },
            {
                url: "https://ok.example.com/ok.jpg",
                alt: "ok",
                width: 0,
                height: -5,
            },
        ],
        socialLinks: { instagram: "javascript:alert(1)", facebook: "ftp://x" },
    });
    const out = renderCardOgHtml({ seo: baseSeo(), render });
    assert(!/javascript:/i.test(out), "F3 no javascript: links");
    assert(!/src="data:/i.test(out), "F3 no data: image");
    assert(!out.includes("http://insecure"), "F3 no http: website");
    assert(!/ftp:/i.test(out), "F3 no ftp: link");
    // Use precise attribute regexes: viewport meta legitimately contains
    // "width=device-width" but never width="..." with quote+digit.
    assert(
        !/\swidth="/.test(out),
        "F3 no width= attribute (invalid 0 dropped)",
    );
    assert(
        !/\sheight="/.test(out),
        "F3 no height= attribute (invalid -5 dropped)",
    );
    assert(
        out.includes('src="https://ok.example.com/ok.jpg"'),
        "F3 safe https image still emitted",
    );
}

/* ───────── F4 style / refresh / target policy ───────── */
{
    const out = renderCardOgHtml({ seo: baseSeo(), render: baseRender() });
    assert(!/<style[\s>]/i.test(out), "F4 no <style block");
    assert(!/\sstyle\s*=/i.test(out), "F4 no style= attribute");
    assert(
        !/http-equiv\s*=\s*["']?refresh/i.test(out),
        "F4 no http-equiv refresh",
    );
    assert(!/\starget\s*=/i.test(out), "F4 no target= attribute");
}

/* ───────── F5 TypeError guards ───────── */
{
    assertThrowsTypeError(
        () =>
            renderCardOgHtml({
                seo: baseSeo({ canonicalUrl: undefined }),
                render: baseRender(),
            }),
        "F5 missing canonicalUrl throws",
    );
    assertThrowsTypeError(
        () =>
            renderCardOgHtml({
                seo: baseSeo({ ogUrl: "" }),
                render: baseRender(),
            }),
        "F5 empty ogUrl throws",
    );
    assertThrowsTypeError(
        () =>
            renderCardOgHtml({
                seo: baseSeo({ canonicalUrl: "http://insecure.example.com" }),
                render: baseRender(),
            }),
        "F5 non-https canonicalUrl throws",
    );
    assertThrowsTypeError(
        () => renderCardOgHtml({ seo: null, render: baseRender() }),
        "F5 non-plain seo throws",
    );
    assertThrowsTypeError(
        () => renderCardOgHtml({ seo: baseSeo(), render: "x" }),
        "F5 non-plain render throws",
    );
}

/* ───────── F6 displayName fallback ───────── */
{
    const out1 = renderCardOgHtml({
        seo: baseSeo({ title: "From SEO" }),
        render: baseRender({ displayName: "" }),
    });
    assert(/<h1>From SEO<\/h1>/.test(out1), "F6 fallback to seo.title");
    const out2 = renderCardOgHtml({
        seo: baseSeo({ title: "" }),
        render: baseRender({ displayName: "" }),
    });
    assert(
        /<h1>כרטיס ביקור דיגיטלי<\/h1>/.test(out2),
        "F6 fallback to hard string",
    );
}

/* ───────── F7 businessHours visibility ───────── */
{
    const closed = baseRender({
        businessHours: { enabled: false, week: {} },
    });
    const outClosed = renderCardOgHtml({ seo: baseSeo(), render: closed });
    assert(!outClosed.includes("שעות פעילות"), "F7 enabled:false absent");

    const allClosed = baseRender({
        businessHours: {
            enabled: true,
            week: {
                sun: { open: false, intervals: [] },
                mon: { open: false, intervals: [] },
                tue: { open: false, intervals: [] },
                wed: { open: false, intervals: [] },
                thu: { open: false, intervals: [] },
                fri: { open: false, intervals: [] },
                sat: { open: false, intervals: [] },
            },
        },
    });
    const outAllClosed = renderCardOgHtml({
        seo: baseSeo(),
        render: allClosed,
    });
    assert(!outAllClosed.includes("שעות פעילות"), "F7 all-closed absent");

    const outOpen = renderCardOgHtml({ seo: baseSeo(), render: baseRender() });
    assert(outOpen.includes("שעות פעילות"), "F7 mon open: section present");
    assert(outOpen.includes("09:00–17:00"), "F7 mon interval text present");
}

/* ───────── F8 lang/dir hardening ───────── */
{
    const out = renderCardOgHtml({
        seo: baseSeo(),
        render: baseRender(),
        lang: 'he" onload="x',
        dir: "javascript:",
    });
    assert(
        /<html lang="he" dir="rtl">/.test(out),
        "F8 unsafe lang/dir fall back to defaults",
    );
}

/* ───────── F9 determinism ───────── */
{
    const seo = baseSeo();
    const render = baseRender();
    const a = renderCardOgHtml({ seo, render });
    const b = renderCardOgHtml({ seo, render });
    assert(a === b, "F9 byte-identical on same inputs");
}

/* ───────── F10 input immutability (frozen inputs) ───────── */
{
    function deepFreeze(obj) {
        if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
            Object.freeze(obj);
            for (const k of Object.keys(obj)) deepFreeze(obj[k]);
        }
        return obj;
    }
    const seo = deepFreeze(baseSeo());
    const render = deepFreeze(baseRender());
    let threw = false;
    let out = "";
    try {
        out = renderCardOgHtml({ seo, render });
    } catch {
        threw = true;
    }
    assert(!threw, "F10 no throw on deep-frozen inputs");
    assert(out.length > 0, "F10 output produced");
}

/* ───────── Summary ─────────────────────────────────────────────── */
console.log("----------------------------------------");
console.log("Total: " + total + "  Failed: " + failed);
if (failed > 0) {
    process.exitCode = 1;
}
