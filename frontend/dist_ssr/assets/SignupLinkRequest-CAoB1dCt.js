import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { B as Button, c as requestSignupLink } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const form = "_form_1f28g_1";
const error = "_error_1f28g_13";
const messageBox = "_messageBox_1f28g_23";
const message = "_message_1f28g_23";
const hint = "_hint_1f28g_45";
const sep = "_sep_1f28g_55";
const styles = {
  form,
  error,
  messageBox,
  message,
  hint,
  sep
};
function SignupLinkRequest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [done, setDone] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestSignupLink(email);
      setDone(true);
    } catch {
      setError("לא ניתן לשלוח קישור כרגע. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "הרשמה באמצעות קישור",
      subtitle: "הזן/י אימייל ונשלח קישור להשלמת ההרשמה.",
      footer: /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" }),
        /* @__PURE__ */ jsx("span", { className: styles.sep, "aria-hidden": "true", children: "·" }),
        /* @__PURE__ */ jsx(Link, { to: "/forgot-password", children: "שכחת סיסמה?" })
      ] }),
      children: /* @__PURE__ */ jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "אימייל",
            type: "email",
            autoComplete: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true
          }
        ),
        error2 ? /* @__PURE__ */ jsx("p", { className: styles.error, children: error2 }) : null,
        done ? /* @__PURE__ */ jsxs("div", { className: styles.messageBox, children: [
          /* @__PURE__ */ jsx("p", { className: styles.message, children: "אם האימייל מתאים - נשלח קישור להשלמת ההרשמה." }),
          /* @__PURE__ */ jsx("p", { className: styles.hint, children: "אם כבר יש חשבון - השתמשו ב-Login / Forgot password." })
        ] }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", fullWidth: true, loading, children: "שלח קישור" })
      ] })
    }
  );
}
export {
  SignupLinkRequest as default
};
