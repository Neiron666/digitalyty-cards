import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { M as trackSitePageView, S as SeoHelmet, N as CONTENT_DISPLAY_POLICY } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const blogWrap = "_blogWrap_1cb51_7";
const article = "_article_1cb51_7";
const articleInner = "_articleInner_1cb51_7";
const articleHeader = "_articleHeader_1cb51_135";
const articleTitle = "_articleTitle_1cb51_157";
const articleExcerpt = "_articleExcerpt_1cb51_215";
const articleDivider = "_articleDivider_1cb51_235";
const backRow = "_backRow_1cb51_257";
const backLink = "_backLink_1cb51_267";
const date = "_date_1cb51_303";
const heroImage = "_heroImage_1cb51_317";
const section = "_section_1cb51_335";
const sectionHeading = "_sectionHeading_1cb51_343";
const sectionBody = "_sectionBody_1cb51_435";
const sectionImage = "_sectionImage_1cb51_451";
const authorCard = "_authorCard_1cb51_525";
const authorAvatar = "_authorAvatar_1cb51_569";
const authorInfo = "_authorInfo_1cb51_587";
const authorName = "_authorName_1cb51_601";
const authorBio = "_authorBio_1cb51_615";
const status = "_status_1cb51_665";
const statusError = "_statusError_1cb51_679";
const relatedWrap = "_relatedWrap_1cb51_697";
const relatedTitle = "_relatedTitle_1cb51_709";
const relatedList = "_relatedList_1cb51_725";
const relatedItem = "_relatedItem_1cb51_749";
const relatedName = "_relatedName_1cb51_779";
const relatedThumb = "_relatedThumb_1cb51_799";
const styles = {
  blogWrap,
  article,
  articleInner,
  articleHeader,
  articleTitle,
  articleExcerpt,
  articleDivider,
  backRow,
  backLink,
  date,
  heroImage,
  section,
  sectionHeading,
  sectionBody,
  sectionImage,
  authorCard,
  authorAvatar,
  authorInfo,
  authorName,
  authorBio,
  status,
  statusError,
  relatedWrap,
  relatedTitle,
  relatedList,
  relatedItem,
  relatedName,
  relatedThumb
};
const ORIGIN = "https://cardigo.co.il";
const BLOG_OG_FALLBACK = `${ORIGIN}/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp`;
const BLOG_THUMB_FALLBACK = "/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp";
const DEFAULT_AUTHOR_AVATAR = "/images/blog/author-img/%D7%95%D7%9C%D7%A0%D7%98%D7%99%D7%9F.jpg";
const DEFAULT_AUTHOR_IMG_ALT = "תמונת מחבר המאמר - Cardigo Blog";
const DEFAULT_AUTHOR_NAME = "ולנטין";
const DEFAULT_AUTHOR_BIO = /* @__PURE__ */ jsxs(Fragment, { children: [
  "מייסד ",
  /* @__PURE__ */ jsx(Link, { to: "/", children: "Cardigo" }),
  " - כרטיסי ביקור דיגיטליים"
] });
function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}
function textToParagraphs(text) {
  if (!text) return [];
  return text.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean);
}
const CANONICAL_ORIGIN = (() => {
  try {
    return new URL(ORIGIN).origin;
  } catch {
    return "https://cardigo.co.il";
  }
})();
function validateLinkUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed[0] === "/") {
    if (trimmed[1] === "/") return null;
    return { href: trimmed, isInternal: true };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isInternal = parsed.origin === CANONICAL_ORIGIN || currentOrigin && parsed.origin === currentOrigin;
  return { href: trimmed, isInternal };
}
const MD_LINK_RE = /\[([^\[\]]+)\]\(([^()\s]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>\[\]"']+/g;
const TRAILING_PUNCT_RE = /[.,;:!?]+$/;
function renderLinkedText(text) {
  if (!text) return [text];
  const parts = [];
  let cursor = 0;
  let keyIdx = 0;
  let match;
  MD_LINK_RE.lastIndex = 0;
  while ((match = MD_LINK_RE.exec(text)) !== null) {
    const [full, anchorText, rawUrl] = match;
    const idx = match.index;
    if (idx > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, idx) });
    }
    const linkInfo = validateLinkUrl(rawUrl);
    if (linkInfo) {
      parts.push({
        type: "link",
        href: linkInfo.href,
        isInternal: linkInfo.isInternal,
        display: anchorText
      });
    } else {
      parts.push({ type: "text", value: full });
    }
    cursor = idx + full.length;
  }
  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }
  const final = [];
  for (const part of parts) {
    if (part.type === "link") {
      final.push(part);
      continue;
    }
    const segment = part.value;
    let sCursor = 0;
    BARE_URL_RE.lastIndex = 0;
    let urlMatch;
    while ((urlMatch = BARE_URL_RE.exec(segment)) !== null) {
      const rawBare = urlMatch[0];
      const sIdx = urlMatch.index;
      if (sIdx > sCursor) {
        final.push({
          type: "text",
          value: segment.slice(sCursor, sIdx)
        });
      }
      const urlToValidate = rawBare.replace(TRAILING_PUNCT_RE, "") || rawBare;
      const trailingChars = rawBare.slice(urlToValidate.length);
      const linkInfo = validateLinkUrl(urlToValidate);
      if (linkInfo) {
        final.push({
          type: "link",
          href: linkInfo.href,
          isInternal: linkInfo.isInternal,
          display: urlToValidate
        });
        if (trailingChars) {
          final.push({ type: "text", value: trailingChars });
        }
      } else {
        final.push({ type: "text", value: rawBare });
      }
      sCursor = sIdx + rawBare.length;
    }
    if (sCursor < segment.length) {
      final.push({ type: "text", value: segment.slice(sCursor) });
    }
  }
  return final.map((node) => {
    if (node.type === "text") return node.value;
    const key = `bl-${keyIdx++}`;
    if (node.isInternal) {
      return /* @__PURE__ */ jsx("a", { href: node.href, children: node.display }, key);
    }
    return /* @__PURE__ */ jsx(
      "a",
      {
        href: node.href,
        target: "_blank",
        rel: "noopener noreferrer",
        children: node.display
      },
      key
    );
  });
}
function buildBlogPostingJsonLd(post) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${ORIGIN}/blog/${post.slug}#article`,
    headline: post.title || "",
    description: post.seo?.description || post.excerpt || "",
    url: `${ORIGIN}/blog/${post.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${ORIGIN}/blog/${post.slug}`
    },
    inLanguage: "he",
    datePublished: post.publishedAt || void 0,
    dateModified: post.updatedAt || post.publishedAt || void 0,
    author: {
      "@type": "Person",
      name: post.authorName || DEFAULT_AUTHOR_NAME
    },
    publisher: {
      "@type": "Organization",
      name: "Cardigo",
      url: ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${ORIGIN}/images/brand-logo/cardigo-logo.png`
      }
    }
  };
  ld.image = post.heroImageUrl || BLOG_OG_FALLBACK;
  return ld;
}
function buildBreadcrumbJsonLd(post) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "בלוג",
        item: `${ORIGIN}/blog`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: post.title || "",
        item: `${ORIGIN}/blog/${post.slug}`
      }
    ]
  };
}
function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [related, setRelated] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    trackSitePageView();
  }, []);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const res = await fetch(
          `/api/blog/${encodeURIComponent(slug)}`
        );
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("שגיאה בטעינת המאמר");
        const data = await res.json();
        if (!cancelled) setPost(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "שגיאה בטעינת המאמר");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  useEffect(() => {
    if (!slug) return;
    let dead = false;
    fetch("/api/blog?page=1&limit=4").then((r) => r.ok ? r.json() : null).then((data) => {
      if (dead || !data) return;
      const others = (data.items || []).filter((p) => p.slug !== slug).slice(0, 3);
      setRelated(others);
    }).catch(() => {
    });
    return () => {
      dead = true;
    };
  }, [slug]);
  useEffect(() => {
    if (post && post.slug && post.slug !== slug) {
      navigate(`/blog/${post.slug}`, { replace: true });
    }
  }, [post, slug, navigate]);
  if (loading) {
    return /* @__PURE__ */ jsx("main", { className: styles.blogWrap, "data-page": "site", children: /* @__PURE__ */ jsx("p", { className: styles.status, children: "טוען מאמר…" }) });
  }
  if (notFound) {
    return /* @__PURE__ */ jsxs("main", { className: styles.blogWrap, "data-page": "site", children: [
      /* @__PURE__ */ jsx(
        SeoHelmet,
        {
          robots: "noindex, nofollow",
          title: "המאמר לא נמצא | Cardigo"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: styles.status, children: "המאמר לא נמצא." }),
      /* @__PURE__ */ jsx("div", { className: styles.backRow, children: /* @__PURE__ */ jsx(Link, { to: "/blog", className: styles.backLink, children: "חזרה לבלוג" }) })
    ] });
  }
  if (error || !post) {
    return /* @__PURE__ */ jsxs("main", { className: styles.blogWrap, "data-page": "site", children: [
      /* @__PURE__ */ jsx(
        SeoHelmet,
        {
          title: "שגיאה בטעינת המאמר | Cardigo",
          description: "לא ניתן לטעון את המאמר כרגע. אנא נסה שוב מאוחר יותר.",
          robots: "noindex, nofollow"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: styles.statusError, children: error || "שגיאה בטעינה" }),
      /* @__PURE__ */ jsx("div", { className: styles.backRow, children: /* @__PURE__ */ jsx(Link, { to: "/blog", className: styles.backLink, children: "חזרה לבלוג" }) })
    ] });
  }
  const seoTitle = post.seo?.title || post.title || "בלוג | Cardigo";
  const seoDescription = post.seo?.description || post.excerpt || "";
  const canonicalUrl = `${ORIGIN}/blog/${post.slug}`;
  const jsonLdItems = [
    buildBlogPostingJsonLd(post),
    buildBreadcrumbJsonLd(post)
  ];
  return /* @__PURE__ */ jsxs("main", { className: styles.blogWrap, "data-page": "site", children: [
    /* @__PURE__ */ jsx(
      SeoHelmet,
      {
        title: seoTitle,
        description: seoDescription,
        canonicalUrl,
        url: canonicalUrl,
        image: post.heroImageUrl || BLOG_OG_FALLBACK,
        ogType: "article",
        jsonLdItems,
        articlePublishedTime: post.publishedAt || void 0,
        articleModifiedTime: post.updatedAt || post.publishedAt || void 0,
        articleAuthor: post.authorName || DEFAULT_AUTHOR_NAME,
        imageAlt: post.heroImageAlt || post.title || void 0
      }
    ),
    /* @__PURE__ */ jsx("article", { className: styles.article, children: /* @__PURE__ */ jsxs("div", { className: styles.articleInner, children: [
      /* @__PURE__ */ jsxs("header", { className: styles.articleHeader, children: [
        CONTENT_DISPLAY_POLICY.showPublishedDates && post.publishedAt && /* @__PURE__ */ jsx(
          "time",
          {
            className: styles.date,
            dateTime: post.publishedAt,
            children: formatDate(post.publishedAt)
          }
        ),
        /* @__PURE__ */ jsx("h1", { className: styles.articleTitle, children: post.title }),
        post.excerpt && /* @__PURE__ */ jsx("p", { className: styles.articleExcerpt, children: post.excerpt }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: styles.articleDivider,
            "aria-hidden": "true"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "img",
        {
          className: styles.heroImage,
          src: post.heroImageUrl || BLOG_OG_FALLBACK,
          alt: post.heroImageAlt || post.title || ""
        }
      ),
      (post.sections || []).map((section2, i) => /* @__PURE__ */ jsxs("section", { className: styles.section, children: [
        section2.heading && /* @__PURE__ */ jsx("h2", { className: styles.sectionHeading, children: section2.heading }),
        section2.imageUrl && /* @__PURE__ */ jsx(
          "img",
          {
            className: styles.sectionImage,
            src: section2.imageUrl,
            alt: section2.imageAlt || "",
            loading: "lazy"
          }
        ),
        textToParagraphs(section2.body).map((para, j) => /* @__PURE__ */ jsx("p", { className: styles.sectionBody, children: renderLinkedText(para) }, j))
      ] }, i)),
      post.authorName && /* @__PURE__ */ jsxs(
        "aside",
        {
          className: styles.authorCard,
          "aria-label": "מחבר הפוסט",
          children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                className: styles.authorAvatar,
                src: post.authorImageUrl || DEFAULT_AUTHOR_AVATAR,
                alt: post.authorImageAlt || DEFAULT_AUTHOR_IMG_ALT
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: styles.authorInfo, children: [
              /* @__PURE__ */ jsx("span", { className: styles.authorName, children: DEFAULT_AUTHOR_NAME }),
              /* @__PURE__ */ jsx("span", { className: styles.authorBio, children: post.authorBio || DEFAULT_AUTHOR_BIO })
            ] })
          ]
        }
      ),
      related.length > 0 && /* @__PURE__ */ jsxs(
        "nav",
        {
          className: styles.relatedWrap,
          "aria-label": "מאמרים נוספים",
          children: [
            /* @__PURE__ */ jsx("h2", { className: styles.relatedTitle, children: "עוד מאמרים" }),
            /* @__PURE__ */ jsx("div", { className: styles.relatedList, children: related.map((r) => /* @__PURE__ */ jsxs(
              Link,
              {
                to: `/blog/${r.slug}`,
                className: styles.relatedItem,
                children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      className: styles.relatedThumb,
                      src: r.heroImageUrl || BLOG_THUMB_FALLBACK,
                      alt: r.heroImageAlt || r.title || "",
                      loading: "lazy"
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: styles.relatedName, children: r.title })
                ]
              },
              r.id
            )) })
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { className: styles.backRow, children: /* @__PURE__ */ jsx(Link, { to: "/blog", className: styles.backLink, children: "חזרה לבלוג" }) })
    ] }) })
  ] });
}
export {
  BlogPost as default
};
