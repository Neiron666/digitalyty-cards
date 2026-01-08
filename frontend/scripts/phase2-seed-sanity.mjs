import { seedTemplateContent } from "../src/templates/seed/seedTemplateContent.js";
import { getTemplateById } from "../src/templates/templates.config.js";

function fail(msg) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
}

function pass(msg) {
    console.log(`PASS: ${msg}`);
}

const tpl = getTemplateById("businessClassic");
if (!tpl) {
    fail("template businessClassic not found");
} else {
    pass("template businessClassic found");
}

// 1) socials (array of objects) should seed if empty
{
    const empty = { design: { templateId: "businessClassic" }, socials: [] };
    const seeded = seedTemplateContent(empty, tpl);
    const ok =
        Array.isArray(seeded.socials) &&
        (seeded.socials.length === 0 || typeof seeded.socials[0] === "object");
    if (!ok) fail("socials did not seed as array of objects");
    else pass("socials seeds (array of objects) when empty");
}

// 2) gallery string[] should seed only /templates/... (we simulate sample data)
{
    const fakeTpl = {
        ...tpl,
        seededFields: ["gallery"],
        sampleData: {
            gallery: [
                "/templates/classic.svg",
                "https://example.com/evil.png",
                "data:image/png;base64,AAAA",
            ],
        },
    };
    const empty = { design: { templateId: "businessClassic" }, gallery: [] };
    const seeded = seedTemplateContent(empty, fakeTpl);
    const ok =
        Array.isArray(seeded.gallery) &&
        seeded.gallery.length === 1 &&
        seeded.gallery[0] === "/templates/classic.svg";
    if (!ok) fail("gallery string[] did not filter to local /templates only");
    else pass("gallery string[] seeds local /templates only");
}

// 3) cover/avatar strings should seed only /templates/... (simulate sample data)
{
    const fakeTpl = {
        ...tpl,
        seededFields: ["coverImage", "avatarImage"],
        sampleData: {
            coverImage: "https://example.com/evil.png",
            avatarImage: "/templates/minimal.svg",
        },
    };
    const empty = {
        design: { templateId: "businessClassic" },
        coverImage: "",
        avatarImage: "",
    };
    const seeded = seedTemplateContent(empty, fakeTpl);

    if (seeded.coverImage) fail("coverImage should NOT seed non-local url");
    else pass("coverImage blocks non-local seed value");

    if (seeded.avatarImage !== "/templates/minimal.svg")
        fail("avatarImage should seed local /templates value");
    else pass("avatarImage seeds local /templates value");
}

// 4) non-empty fields must not be overwritten
{
    const fakeTpl = {
        ...tpl,
        seededFields: ["name"],
        sampleData: { name: "Seeded Name" },
    };
    const card = { design: { templateId: "businessClassic" }, name: "User Name" };
    const seeded = seedTemplateContent(card, fakeTpl);
    if (seeded.name !== "User Name") fail("non-empty name was overwritten");
    else pass("non-empty fields are not overwritten");
}

if (!process.exitCode) {
    console.log("PASS: phase2 seed sanity checks passed");
}
