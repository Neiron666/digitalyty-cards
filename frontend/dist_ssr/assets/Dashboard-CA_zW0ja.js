import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { u as useAuth, S as SeoHelmet, F as FlashBanner } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const main = "_main_1muxz_1";
const email = "_email_1muxz_13";
const flashWrap = "_flashWrap_1muxz_23";
const flash = "_flash_1muxz_23";
const styles = {
  main,
  email,
  flashWrap,
  flash
};
function coerceFlashFromState(state) {
  const flash2 = state?.flash;
  if (flash2 && typeof flash2 === "object") {
    const type = flash2.type;
    const message = flash2.message;
    if (typeof message === "string" && message.trim()) {
      return {
        type: type === "success" || type === "error" || type === "info" ? type : "info",
        message
      };
    }
  }
  const notice = state?.notice;
  if (notice && typeof notice === "object") {
    const type = notice.type;
    const message = notice.text;
    if (typeof message === "string" && message.trim()) {
      return {
        type: type === "success" || type === "error" || type === "info" ? type : "info",
        message
      };
    }
  }
  return null;
}
function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [flash2, setFlash] = useState(null);
  const lastHandledKeyRef = useRef(null);
  useEffect(() => {
    if (!location?.key) return;
    if (lastHandledKeyRef.current === location.key) return;
    lastHandledKeyRef.current = location.key;
    const nextFlash = coerceFlashFromState(location.state);
    if (!nextFlash) return;
    setFlash(nextFlash);
    navigate(".", { replace: true, state: null });
  }, [location, navigate]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    flash2 ? /* @__PURE__ */ jsx("div", { className: styles.flashWrap, children: /* @__PURE__ */ jsx("div", { className: styles.flash, children: /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash2.type,
        message: flash2.message,
        onDismiss: () => setFlash(null)
      }
    ) }) }) : null,
    /* @__PURE__ */ jsxs("main", { className: styles.main, children: [
      /* @__PURE__ */ jsx("h1", { children: "הדשבורד שלי" }),
      isAuthenticated && user?.email ? /* @__PURE__ */ jsxs("p", { className: styles.email, children: [
        "Email: ",
        user.email
      ] }) : null,
      /* @__PURE__ */ jsx("p", { children: "כאן תוכל לנהל את כרטיס הביקור הדיגיטלי שלך." }),
      /* @__PURE__ */ jsx("p", { children: "העמוד בבנייה 🚧" })
    ] })
  ] });
}
export {
  Dashboard as default
};
