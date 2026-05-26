import { jsxs, jsx } from "react/jsx-runtime";
const notice = "_notice_10xro_5";
const success = "_success_10xro_37";
const error = "_error_10xro_51";
const info = "_info_10xro_65";
const icon = "_icon_10xro_79";
const styles = {
  notice,
  success,
  error,
  info,
  icon
};
const VARIANTS = {
  success: { cls: styles.success, icon: "✓", role: "status", live: "polite" },
  error: { cls: styles.error, icon: "✗", role: "alert", live: "assertive" },
  info: { cls: styles.info, icon: "ℹ", role: "status", live: "polite" }
};
function Notice({ variant = "info", children }) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `${styles.notice} ${v.cls}`,
      role: v.role,
      "aria-live": v.live,
      children: [
        /* @__PURE__ */ jsx("span", { className: styles.icon, "aria-hidden": "true", children: v.icon }),
        children
      ]
    }
  );
}
export {
  Notice as N
};
