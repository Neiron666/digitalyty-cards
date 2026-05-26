import { jsxs, jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { S as SeoHelmet } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const page = "_page_1ipyz_1";
const card = "_card_1ipyz_23";
const text = "_text_1ipyz_43";
const brandBlock = "_brandBlock_1ipyz_59";
const brandImg = "_brandImg_1ipyz_75";
const styles = {
  page,
  card,
  text,
  brandBlock,
  brandImg
};
function IframeReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawStatus = searchParams.get("status");
  const status = rawStatus === "success" ? "success" : "fail";
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "CARDIGO_PAYMENT_STATUS", status },
        window.location.origin
      );
    }
  }, [status]);
  useEffect(() => {
    if (window.parent !== window) return;
    const dest = status === "success" ? "/edit/card/settings" : "/pricing?payment=fail";
    const delay = status === "success" ? 2e3 : 0;
    const t = setTimeout(() => navigate(dest, { replace: true }), delay);
    return () => clearTimeout(t);
  }, [status, navigate]);
  return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
      /* @__PURE__ */ jsx("div", { className: styles.brandBlock, "aria-label": "Cardigo", children: /* @__PURE__ */ jsxs("picture", { children: [
        /* @__PURE__ */ jsx(
          "source",
          {
            type: "image/webp",
            srcSet: "/images/brand-logo/cardigo-logo.webp"
          }
        ),
        /* @__PURE__ */ jsx(
          "img",
          {
            src: "/images/brand-logo/cardigo-logo.png",
            alt: "Cardigo",
            className: styles.brandImg,
            loading: "lazy",
            decoding: "async"
          }
        )
      ] }) }),
      status === "success" ? /* @__PURE__ */ jsx("p", { className: styles.text, children: "מעבדים את אישור התשלום..." }) : /* @__PURE__ */ jsx("p", { className: styles.text, children: "התשלום לא הושלם. ניתן לחזור ולנסות שוב." })
    ] })
  ] });
}
export {
  IframeReturnPage as default
};
