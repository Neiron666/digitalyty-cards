import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { u as useAuth, B as Button } from "../entry-server.js";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-CGCIIpQL.js";
import { P as PasswordInput } from "./PasswordInput-BD8q1tgz.js";
import { N as Notice } from "./Notice-Rge9ZUBq.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const note = "_note_nj29g_11";
const authSubmit = "_authSubmit_nj29g_25";
const styles = {
  note,
  authSubmit
};
function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const resetDone = searchParams.get("reset") === "1";
  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setFieldErrors((p) => ({ ...p, [field]: "" }));
  }
  function validate() {
    const errs = { email: "", password: "" };
    if (!form.email.trim()) {
      errs.email = "שדה האימייל הוא חובה";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "כתובת האימייל אינה תקינה";
    }
    if (!form.password) {
      errs.password = "שדה הסיסמה הוא חובה";
    }
    return errs;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.email || errs.password) {
      setFieldErrors(errs);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/edit", { replace: true });
    } catch (err) {
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (code === "EMAIL_NOT_VERIFIED") {
        setError(
          "יש לאמת את כתובת האימייל לפני התחברות. בדקו את תיבת הדואר שלכם."
        );
      } else if (status === 401) {
        setError("האימייל או הסיסמה שגויים. נסו שוב.");
      } else {
        setError(err?.response?.data?.message || "שגיאה בהתחברות");
      }
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxs(
    AuthLayout,
    {
      title: "התחברות",
      footer: /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          "אין לך חשבון? ",
          /* @__PURE__ */ jsx(Link, { to: "/register", children: "צור חשבון" })
        ] }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Link, { to: "/forgot-password", children: "שכחת סיסמה?" }) })
      ] }),
      children: [
        resetDone && /* @__PURE__ */ jsx("p", { className: styles.note, children: "הסיסמה עודכנה בהצלחה. אפשר להתחבר." }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "אימייל",
              type: "email",
              autoComplete: "email",
              value: form.email,
              onChange: (e) => update("email", e.target.value),
              required: true,
              error: fieldErrors.email
            }
          ),
          /* @__PURE__ */ jsx(
            PasswordInput,
            {
              label: "סיסמה",
              autoComplete: "current-password",
              value: form.password,
              onChange: (e) => update("password", e.target.value),
              required: true,
              error: fieldErrors.password
            }
          ),
          error && /* @__PURE__ */ jsx(Notice, { variant: "error", children: error }),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "submit",
              fullWidth: true,
              loading,
              className: styles.authSubmit,
              children: "התחבר"
            }
          )
        ] })
      ]
    }
  );
}
export {
  Login as default
};
