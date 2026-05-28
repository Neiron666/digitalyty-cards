import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { H as Helmet } from "./vendor-epyEJgau.js";
import { useParams } from "react-router-dom";
import { a as api } from "../entry-server.js";
import { C as CardRenderer } from "./CardRenderer-C5zvSwxq.js";
import { w as withDemoPreviewCard } from "./previewDemo-CU0vgzs9.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "react-dom/server";
import "axios";
import "qrcode.react";
import "./Notice-Rge9ZUBq.js";
const previewPage = "_previewPage_ppjv0_1";
const previewContainer = "_previewContainer_ppjv0_15";
const previewNotice = "_previewNotice_ppjv0_43";
const styles = {
  previewPage,
  previewContainer,
  previewNotice
};
function toNotFoundErrorMessage() {
  return "כרטיס לא נמצא";
}
function PreviewCard() {
  const { slug, orgSlug } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setCard(null);
      const safeSlug = String(slug || "").trim();
      const safeOrgSlug = String(orgSlug || "").trim();
      if (!safeSlug) {
        setError(toNotFoundErrorMessage());
        setLoading(false);
        return;
      }
      const url = safeOrgSlug ? `/preview/c/${safeOrgSlug}/${safeSlug}` : `/preview/cards/${safeSlug}`;
      try {
        const res = await api.get(url);
        setCard(res.data);
      } catch {
        setError(toNotFoundErrorMessage());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, orgSlug]);
  const previewCard = useMemo(() => withDemoPreviewCard(card), [card]);
  if (loading) return /* @__PURE__ */ jsx("p", { children: "טוען כרטיס..." });
  if (error) return /* @__PURE__ */ jsx("p", { children: error });
  if (!previewCard) return null;
  return /* @__PURE__ */ jsxs("div", { className: styles.previewPage, children: [
    /* @__PURE__ */ jsx(Helmet, { children: /* @__PURE__ */ jsx("meta", { name: "robots", content: "noindex, nofollow, noarchive" }) }),
    /* @__PURE__ */ jsxs("div", { className: styles.previewContainer, children: [
      /* @__PURE__ */ jsx("div", { className: styles.previewNotice, children: "מצב תצוגה מקדימה" }),
      /* @__PURE__ */ jsx(CardRenderer, { card: previewCard, mode: "public" })
    ] })
  ] });
}
export {
  PreviewCard as default
};
