import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useId } from "react";
import { Link } from "react-router-dom";
import { B as Button, r as register } from "../entry-server.js";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input, F as FieldValidationMessage } from "./Input-CGCIIpQL.js";
import { N as Notice } from "./Notice-Rge9ZUBq.js";
import { P as PASSWORD_POLICY_HELPER_TEXT_HE, a as PASSWORD_POLICY, g as getPasswordPolicyChecklist, b as getPasswordPolicyMessage, v as validatePasswordPolicy } from "./passwordPolicy-XzlGEeig.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const form = "_form_x41hh_19";
const successMessage = "_successMessage_x41hh_85";
const successHint = "_successHint_x41hh_97";
const consentRow = "_consentRow_x41hh_149";
const consentText = "_consentText_x41hh_191";
const consentLink = "_consentLink_x41hh_203";
const marketingRow = "_marketingRow_x41hh_239";
const marketingHint = "_marketingHint_x41hh_281";
const authSubmit = "_authSubmit_x41hh_295";
const pwChecklist = "_pwChecklist_x41hh_305";
const pwChecklistItem = "_pwChecklistItem_x41hh_325";
const pwChecklistItemMet = "_pwChecklistItemMet_x41hh_353";
const spam = "_spam_x41hh_369";
const styles = {
  form,
  successMessage,
  successHint,
  consentRow,
  consentText,
  consentLink,
  marketingRow,
  marketingHint,
  authSubmit,
  pwChecklist,
  pwChecklistItem,
  pwChecklistItemMet,
  spam
};
function Register() {
  const [form2, setForm] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
    consent: false,
    emailMarketingConsent: false
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
    consent: ""
  });
  const [passwordTouched, setPasswordTouched] = useState(false);
  const consentErrorId = useId();
  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }
  function validate() {
    setPasswordTouched(true);
    const errs = {
      firstName: "",
      email: "",
      password: "",
      confirmPassword: "",
      consent: ""
    };
    if (!form2.firstName.trim()) {
      errs.firstName = "שדה השם הפרטי הוא חובה";
    } else if (form2.firstName.trim().length > 100) {
      errs.firstName = "השם הפרטי ארוך מדי (מקסימום 100 תווים)";
    }
    if (!form2.email.trim()) {
      errs.email = "שדה האימייל הוא חובה";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form2.email.trim())) {
      errs.email = "כתובת האימייל אינה תקינה";
    }
    const pwResult = validatePasswordPolicy(form2.password);
    if (!pwResult.ok) {
      errs.password = getPasswordPolicyMessage(pwResult.code);
    }
    if (!form2.confirmPassword) {
      errs.confirmPassword = "שדה אימות הסיסמה הוא חובה";
    } else if (form2.password !== form2.confirmPassword) {
      errs.confirmPassword = "הסיסמאות לא תואמות";
    }
    if (!form2.consent) {
      errs.consent = "חובה להסכים למדיניות הפרטיות ולתנאי השימוש";
    }
    return errs;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.firstName || errs.email || errs.password || errs.confirmPassword || errs.consent) {
      setFieldErrors(errs);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(
        form2.email,
        form2.firstName,
        form2.password,
        form2.consent,
        form2.emailMarketingConsent
      );
      setRegistered(true);
    } catch (err) {
      const code = err.response?.data?.code;
      const status = err.response?.status;
      if (typeof code === "string" && code.startsWith("PASSWORD_")) {
        setFieldErrors((prev) => ({
          ...prev,
          password: getPasswordPolicyMessage(code)
        }));
        setPasswordTouched(true);
        return;
      }
      if (code === "CONSENT_REQUIRED") {
        setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
      } else if (status === 409) {
        setError("לא ניתן ליצור חשבון עם כתובת האימייל הזו.");
      } else {
        setError(err.response?.data?.message || "שגיאה בהרשמה");
      }
    } finally {
      setLoading(false);
    }
  }
  if (registered) {
    return /* @__PURE__ */ jsx(
      AuthLayout,
      {
        title: "בדקו את האימייל",
        footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" }) }),
        children: /* @__PURE__ */ jsxs("div", { className: styles.form, children: [
          /* @__PURE__ */ jsxs("p", { className: styles.successMessage, children: [
            "נשלח אימייל אימות לכתובת ",
            /* @__PURE__ */ jsx("strong", { children: form2.email }),
            "."
          ] }),
          /* @__PURE__ */ jsxs("p", { className: styles.successHint, children: [
            "לחצו על הקישור באימייל כדי להשלים את ההרשמה. אם לא קיבלתם -",
            " ",
            /* @__PURE__ */ jsx("span", { className: styles.spam, children: "בדקו בתיקיית ה" }),
            /* @__PURE__ */ jsx("span", { className: styles.spam, children: "ספאם." })
          ] })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "יצירת חשבון",
      footer: /* @__PURE__ */ jsxs(Fragment, { children: [
        "כבר יש לך חשבון? ",
        /* @__PURE__ */ jsx(Link, { to: "/login", children: "התחברות" })
      ] }),
      children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "שם פרטי",
            type: "text",
            autoComplete: "given-name",
            value: form2.firstName,
            onChange: (e) => update("firstName", e.target.value),
            required: true,
            error: fieldErrors.firstName
          }
        ),
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "אימייל",
            type: "email",
            autoComplete: "email",
            value: form2.email,
            onChange: (e) => update("email", e.target.value),
            required: true,
            error: fieldErrors.email
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
              required: true,
              "aria-invalid": fieldErrors.consent ? true : void 0,
              "aria-describedby": fieldErrors.consent ? consentErrorId : void 0
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
        fieldErrors.consent && /* @__PURE__ */ jsx(FieldValidationMessage, { id: consentErrorId, children: fieldErrors.consent }),
        /* @__PURE__ */ jsxs("label", { className: styles.marketingRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form2.emailMarketingConsent,
              onChange: (e) => setForm((prev) => ({
                ...prev,
                emailMarketingConsent: e.target.checked
              }))
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles.consentText, children: [
            'אני רוצה לקבל מ-Cardigo תזכורות ועדכונים בדוא"ל',
            /* @__PURE__ */ jsx("span", { className: styles.marketingHint, children: "ניתן לבטל בכל עת" })
          ] })
        ] }),
        error && /* @__PURE__ */ jsx(Notice, { variant: "error", children: error }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            fullWidth: true,
            loading,
            className: styles.authSubmit,
            children: "צור חשבון"
          }
        )
      ] })
    }
  );
}
export {
  Register as default
};
