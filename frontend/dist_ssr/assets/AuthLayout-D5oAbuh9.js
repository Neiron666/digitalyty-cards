import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { S as SeoHelmet } from "../entry-server.js";
const wrapper = "_wrapper_1wl9p_1";
const card = "_card_1wl9p_17";
const header = "_header_1wl9p_37";
const subtitle = "_subtitle_1wl9p_55";
const footer = "_footer_1wl9p_67";
const styles = {
  wrapper,
  card,
  header,
  subtitle,
  footer
};
function AuthLayout({ title, subtitle: subtitle2, children, footer: footer2 }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsx("div", { className: styles.wrapper, children: /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
      /* @__PURE__ */ jsxs("div", { className: styles.header, children: [
        /* @__PURE__ */ jsx("h1", { children: title }),
        subtitle2 && /* @__PURE__ */ jsx("p", { className: styles.subtitle, children: subtitle2 })
      ] }),
      children,
      footer2 && /* @__PURE__ */ jsx("div", { className: styles.footer, children: footer2 })
    ] }) })
  ] });
}
export {
  AuthLayout as A
};
