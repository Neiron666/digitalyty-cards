import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { v as verifyEmail, t as trackRegistrationComplete, B as Button, e as resendVerification } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const wrapper = "_wrapper_racih_1";
const message = "_message_racih_15";
const success = "_success_racih_27";
const error = "_error_racih_39";
const hint = "_hint_racih_51";
const styles = {
  wrapper,
  message,
  success,
  error,
  hint
};
function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => {
    const t = searchParams.get("token");
    return typeof t === "string" ? t.trim() : "";
  }, [searchParams]);
  const [status, setStatus] = useState("idle");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    if (token) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  const attempted = useRef(false);
  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    setStatus("loading");
    verifyEmail(token).then(() => {
      trackRegistrationComplete();
      setStatus("success");
    }).catch(() => {
      setStatus("error");
      setErrorMsg("הקישור לא תקין או שפג תוקפו.");
    });
  }, [token]);
  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      setResendDone(true);
    } catch {
    } finally {
      setResending(false);
    }
  }
  if (!token) {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "אימות אימייל",
        subtitle: "הקישור לאימות חסר או לא תקין.",
        footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" }) }),
        children: /* @__PURE__ */ jsxs("div", { className: styles.wrapper, children: [
          /* @__PURE__ */ jsx("p", { className: styles.error, children: "לא נמצא טוקן לאימות. נסו את הקישור שוב או בקשו חדש." }),
          /* @__PURE__ */ jsx(Button, { onClick: handleResend, loading: resending, children: "שלח שוב אימייל אימות" }),
          resendDone ? /* @__PURE__ */ jsx("p", { className: styles.hint, children: "אם החשבון קיים - נשלח אימייל חדש." }) : null
        ] })
      }
    );
  }
  if (status === "loading") {
    return /* @__PURE__ */ jsx(AuthLayout, { title: "אימות אימייל", subtitle: "מאמת...", children: /* @__PURE__ */ jsx("div", { className: styles.wrapper, children: /* @__PURE__ */ jsx("p", { className: styles.message, children: "נא להמתין..." }) }) });
  }
  if (status === "success") {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "אימות הצליח!",
        subtitle: "כתובת האימייל אומתה בהצלחה.",
        footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" }) }),
        children: /* @__PURE__ */ jsxs("div", { className: styles.wrapper, children: [
          /* @__PURE__ */ jsx("p", { className: styles.success, children: "האימייל אומת. אפשר להתחבר ולהתחיל להשתמש בשירות." }),
          /* @__PURE__ */ jsx(Link, { to: "/login", children: /* @__PURE__ */ jsx(Button, { children: "המשך להתחברות" }) })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "אימות אימייל",
      subtitle: "אירעה שגיאה באימות.",
      footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" }) }),
      children: /* @__PURE__ */ jsxs("div", { className: styles.wrapper, children: [
        /* @__PURE__ */ jsx("p", { className: styles.error, children: errorMsg }),
        /* @__PURE__ */ jsx(Button, { onClick: handleResend, loading: resending, children: "שלח שוב אימייל אימות" }),
        resendDone ? /* @__PURE__ */ jsx("p", { className: styles.hint, children: "אם החשבון קיים - נשלח אימייל חדש." }) : null
      ] })
    }
  );
}
export {
  VerifyEmail as default
};
