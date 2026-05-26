import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { a as api } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const container = "_container_w12qj_1";
const message = "_message_w12qj_19";
const homeLink = "_homeLink_w12qj_33";
const styles = {
  container,
  message,
  homeLink
};
function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => {
    const t = searchParams.get("token");
    return typeof t === "string" ? t.trim() : "";
  }, [searchParams]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    if (token) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  const attempted = useRef(false);
  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    api.post("/unsubscribe/consume", { token }).then(() => {
      setStatus("success");
    }).catch(() => {
      setStatus("error");
    });
  }, [token]);
  if (!token) {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "ביטול הרשמה",
        subtitle: "הקישור לביטול ההרשמה חסר או לא תקין.",
        footer: /* @__PURE__ */ jsx(Link, { to: "/", children: "חזרה לדף הבית" }),
        children: /* @__PURE__ */ jsx("div", { className: styles.container, children: /* @__PURE__ */ jsx("p", { className: styles.message, children: "לא נמצא קישור תקין לביטול ההרשמה. נסו שוב דרך הקישור שנשלח לאימייל." }) })
      }
    );
  }
  if (status === "loading") {
    return /* @__PURE__ */ jsx(AuthLayout, { title: "ביטול הרשמה", subtitle: "מבצע ביטול הרשמה...", children: /* @__PURE__ */ jsx("div", { className: styles.container, children: /* @__PURE__ */ jsx("p", { className: styles.message, children: "נא להמתין..." }) }) });
  }
  if (status === "success") {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "ביטול ההרשמה בוצע",
        subtitle: "הוסרתם בהצלחה מרשימת התפוצה של Cardigo.",
        footer: /* @__PURE__ */ jsx(Link, { to: "/", children: "חזרה לדף הבית" }),
        children: /* @__PURE__ */ jsxs("div", { className: styles.container, children: [
          /* @__PURE__ */ jsx("p", { className: styles.message, children: "לא תקבלו יותר עדכונים שיווקיים מאיתנו." }),
          /* @__PURE__ */ jsx(Link, { to: "/", className: styles.homeLink, children: "חזרה לדף הבית" })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "הקישור אינו תקין",
      subtitle: "הקישור לביטול ההרשמה אינו תקין או שפג תוקפו.",
      footer: /* @__PURE__ */ jsx(Link, { to: "/", children: "חזרה לדף הבית" }),
      children: /* @__PURE__ */ jsxs("div", { className: styles.container, children: [
        /* @__PURE__ */ jsx("p", { className: styles.message, children: "הקישור לא תקין, פג תוקפו, או שכבר נעשה בו שימוש." }),
        /* @__PURE__ */ jsx(Link, { to: "/", className: styles.homeLink, children: "חזרה לדף הבית" })
      ] })
    }
  );
}
export {
  Unsubscribe as default
};
