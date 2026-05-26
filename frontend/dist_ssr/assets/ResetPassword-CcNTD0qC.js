import { jsx, Fragment, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-CGCIIpQL.js";
import { B as Button, b as resetPassword } from "../entry-server.js";
import { P as PASSWORD_POLICY_HELPER_TEXT_HE, a as PASSWORD_POLICY, g as getPasswordPolicyChecklist, v as validatePasswordPolicy, b as getPasswordPolicyMessage } from "./passwordPolicy-XzlGEeig.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const form = "_form_1r1qr_1";
const message = "_message_1r1qr_13";
const error = "_error_1r1qr_25";
const pwChecklist = "_pwChecklist_1r1qr_39";
const pwChecklistItem = "_pwChecklistItem_1r1qr_59";
const pwChecklistItemMet = "_pwChecklistItemMet_1r1qr_87";
const styles = {
  form,
  message,
  error,
  pwChecklist,
  pwChecklistItem,
  pwChecklistItemMet
};
function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => {
    const t = searchParams.get("token");
    return typeof t === "string" ? t.trim() : "";
  }, [searchParams]);
  const [form2, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    password: "",
    confirmPassword: ""
  });
  const [passwordTouched, setPasswordTouched] = useState(false);
  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    if (field === "password" || field === "confirmPassword") {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setPasswordTouched(true);
    setFieldErrors({ password: "", confirmPassword: "" });
    setError("");
    if (!token) {
      setError("קישור האיפוס לא תקין.");
      return;
    }
    const pwResult = validatePasswordPolicy(form2.password);
    if (!pwResult.ok) {
      setFieldErrors((prev) => ({
        ...prev,
        password: getPasswordPolicyMessage(pwResult.code)
      }));
      return;
    }
    if (!form2.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "שדה אימות הסיסמה הוא חובה"
      }));
      return;
    }
    if (form2.password !== form2.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "הסיסמאות לא תואמות."
      }));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, form2.password);
      navigate("/login?reset=1", { replace: true });
    } catch (err) {
      const code = err?.response?.data?.code;
      if (typeof code === "string" && code.startsWith("PASSWORD_")) {
        setFieldErrors((prev) => ({
          ...prev,
          password: getPasswordPolicyMessage(code)
        }));
        setPasswordTouched(true);
      } else if (code === "RATE_LIMITED") {
        setError("נסו שוב בעוד כמה דקות.");
      } else {
        setError("לא ניתן לאפס סיסמה. בקשו קישור חדש.");
      }
    } finally {
      setLoading(false);
    }
  }
  if (!token) {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "איפוס סיסמה",
        subtitle: "הקישור לאיפוס סיסמה חסר או לא תקין.",
        footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/forgot-password", children: "שליחת קישור חדש" }) }),
        children: /* @__PURE__ */ jsx("p", { className: styles.message, children: "אפשר לבקש קישור איפוס חדש ולנסות שוב." })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "קבע/י סיסמה חדשה",
      subtitle: "הזן/י סיסמה חדשה כדי לסיים את האיפוס.",
      footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "חזרה להתחברות" }) }),
      children: /* @__PURE__ */ jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "סיסמה חדשה",
            type: "password",
            autoComplete: "new-password",
            value: form2.password,
            onChange: (e) => update("password", e.target.value),
            onBlur: () => setPasswordTouched(true),
            required: true,
            minLength: PASSWORD_POLICY.minLength,
            maxLength: PASSWORD_POLICY.maxLength,
            meta: PASSWORD_POLICY_HELPER_TEXT_HE,
            error: fieldErrors.password
          }
        ),
        (passwordTouched || fieldErrors.password || form2.password.length > 0) && /* @__PURE__ */ jsx(
          "ul",
          {
            className: styles.pwChecklist,
            "aria-label": "דרישות הסיסמה",
            children: getPasswordPolicyChecklist(form2.password).map(
              (item) => /* @__PURE__ */ jsx(
                "li",
                {
                  className: `${styles.pwChecklistItem}${item.met ? ` ${styles.pwChecklistItemMet}` : ""}`,
                  children: item.label
                },
                item.id
              )
            )
          }
        ),
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "אימות סיסמה",
            type: "password",
            autoComplete: "new-password",
            value: form2.confirmPassword,
            onChange: (e) => update("confirmPassword", e.target.value),
            required: true,
            maxLength: PASSWORD_POLICY.maxLength,
            error: fieldErrors.confirmPassword
          }
        ),
        error2 ? /* @__PURE__ */ jsx("p", { className: styles.error, children: error2 }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", fullWidth: true, loading, children: "שמור סיסמה" })
      ] })
    }
  );
}
export {
  ResetPassword as default
};
