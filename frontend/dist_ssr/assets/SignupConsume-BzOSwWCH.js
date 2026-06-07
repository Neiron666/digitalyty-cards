import { jsx, Fragment, jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { B as Button, d as consumeSignupToken, t as trackRegistrationComplete } from "../entry-server.js";
import { P as PASSWORD_POLICY_HELPER_TEXT_HE, a as PASSWORD_POLICY, g as getPasswordPolicyChecklist, v as validatePasswordPolicy, b as getPasswordPolicyMessage } from "./passwordPolicy-XzlGEeig.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const form = "_form_1gvaq_1";
const error = "_error_1gvaq_13";
const message = "_message_1gvaq_23";
const consentRow = "_consentRow_1gvaq_35";
const consentText = "_consentText_1gvaq_77";
const consentLink = "_consentLink_1gvaq_89";
const marketingRow = "_marketingRow_1gvaq_125";
const marketingHint = "_marketingHint_1gvaq_167";
const pwChecklist = "_pwChecklist_1gvaq_183";
const pwChecklistItem = "_pwChecklistItem_1gvaq_203";
const pwChecklistItemMet = "_pwChecklistItemMet_1gvaq_231";
const styles = {
  form,
  error,
  message,
  consentRow,
  consentText,
  consentLink,
  marketingRow,
  marketingHint,
  pwChecklist,
  pwChecklistItem,
  pwChecklistItemMet
};
function SignupConsume() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => {
    const t = searchParams.get("token");
    return typeof t === "string" ? t.trim() : "";
  }, [searchParams]);
  const [form2, setForm] = useState({
    firstName: "",
    password: "",
    confirmPassword: "",
    consent: false,
    marketingConsent: false
  });
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    password: "",
    confirmPassword: ""
  });
  const [passwordTouched, setPasswordTouched] = useState(false);
  useEffect(() => {
    if (token) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
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
      setError("הקישור לא תקין או חסר.");
      return;
    }
    if (!form2.firstName.trim()) {
      setError("שדה השם הפרטי הוא חובה");
      return;
    }
    if (form2.firstName.trim().length > 100) {
      setError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
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
    if (!form2.consent) {
      setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
      return;
    }
    setLoading(true);
    try {
      const res = await consumeSignupToken(
        token,
        form2.firstName,
        form2.password,
        form2.consent,
        form2.marketingConsent
      );
      if (!res?.data?.ok) {
        setError("לא ניתן להשלים הרשמה. נסו שוב.");
        return;
      }
      trackRegistrationComplete();
      window.location.replace("/edit");
    } catch (err) {
      const code = err?.response?.data?.code;
      if (typeof code === "string" && code.startsWith("PASSWORD_")) {
        setFieldErrors((prev) => ({
          ...prev,
          password: getPasswordPolicyMessage(code)
        }));
        setPasswordTouched(true);
      } else {
        setError("לא ניתן להשלים הרשמה. בקשו קישור חדש.");
      }
    } finally {
      setLoading(false);
    }
  }
  if (!token) {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "השלמת הרשמה",
        subtitle: "הקישור להשלמת הרשמה חסר או לא תקין.",
        footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/signup-link", children: "שליחת קישור חדש" }) }),
        children: /* @__PURE__ */ jsx("p", { className: styles.message, children: "אפשר לבקש קישור חדש ולנסות שוב." })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "השלמת הרשמה",
      subtitle: "קבע/י סיסמה כדי ליצור חשבון ולהיכנס.",
      footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "כבר יש חשבון? התחברות" }) }),
      children: /* @__PURE__ */ jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "שם פרטי",
            type: "text",
            autoComplete: "given-name",
            value: form2.firstName,
            onChange: (e) => update("firstName", e.target.value),
            required: true
          }
        ),
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "סיסמה",
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
        /* @__PURE__ */ jsxs("label", { className: styles.consentRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form2.consent,
              onChange: (e) => update("consent", e.target.checked),
              required: true
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles.consentText, children: [
            "אני מסכים ל",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/privacy",
                target: "_blank",
                rel: "noopener noreferrer",
                className: styles.consentLink,
                children: "מדיניות הפרטיות"
              }
            ),
            " ",
            "וגם ל",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/terms",
                target: "_blank",
                rel: "noopener noreferrer",
                className: styles.consentLink,
                children: "תנאי השימוש באתר"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: styles.marketingRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form2.marketingConsent,
              onChange: (e) => update("marketingConsent", e.target.checked)
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles.consentText, children: [
            "אני רוצה לקבל עדכונים מ-Cardigo על trial, פרימיום ועדכונים חשובים",
            /* @__PURE__ */ jsx("span", { className: styles.marketingHint, children: "ניתן לבטל בכל עת" })
          ] })
        ] }),
        error2 ? /* @__PURE__ */ jsx("p", { className: styles.error, children: error2 }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", fullWidth: true, loading, children: "צור חשבון" })
      ] })
    }
  );
}
export {
  SignupConsume as default
};
