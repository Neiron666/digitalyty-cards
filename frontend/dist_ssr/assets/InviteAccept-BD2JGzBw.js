import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { u as useAuth, B as Button, a as api } from "../entry-server.js";
import { P as PASSWORD_POLICY_HELPER_TEXT_HE, a as PASSWORD_POLICY, g as getPasswordPolicyChecklist, v as validatePasswordPolicy, b as getPasswordPolicyMessage } from "./passwordPolicy-XzlGEeig.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const error = "_error_chyes_1";
const consentRow = "_consentRow_chyes_17";
const consentText = "_consentText_chyes_59";
const consentLink = "_consentLink_chyes_71";
const marketingRow = "_marketingRow_chyes_107";
const marketingHint = "_marketingHint_chyes_149";
const pwChecklist = "_pwChecklist_chyes_165";
const pwChecklistItem = "_pwChecklistItem_chyes_185";
const pwChecklistItemMet = "_pwChecklistItemMet_chyes_213";
const styles = {
  error,
  consentRow,
  consentText,
  consentLink,
  marketingRow,
  marketingHint,
  pwChecklist,
  pwChecklistItem,
  pwChecklistItemMet
};
function InviteAccept() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const token = useMemo(() => {
    const raw = String(location?.search || "");
    const params = new URLSearchParams(raw);
    return String(params.get("token") || "").trim();
  }, [location?.search]);
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const returnTo = useMemo(() => {
    const raw = String(location?.search || "");
    return `/invite${raw}`;
  }, [location?.search]);
  const loginHref = useMemo(() => {
    return `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);
  const isNewUser = !isAuthenticated;
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPasswordError("");
    setLoginRequired(false);
    if (isNewUser) setPasswordTouched(true);
    if (!token) {
      setError("הקישור אינו תקין או שפג תוקפו");
      return;
    }
    const isLoggedIn = isAuthenticated;
    if (!isLoggedIn && !firstName.trim()) {
      setError("שדה השם הפרטי הוא חובה");
      return;
    }
    if (!isLoggedIn && firstName.trim().length > 100) {
      setError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
      return;
    }
    if (!isLoggedIn) {
      const pwResult = validatePasswordPolicy(password);
      if (!pwResult.ok) {
        setPasswordError(getPasswordPolicyMessage(pwResult.code));
        return;
      }
    }
    if (!isLoggedIn && !consent) {
      setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        token,
        ...isNewUser ? {
          firstName: firstName.trim(),
          password,
          consent,
          marketingConsent
        } : null
      };
      const res = await api.post("/invites/accept", payload);
      const orgSlug = String(res?.data?.orgSlug || "").trim();
      if (orgSlug) {
        window.location.replace(
          `/edit?org=${encodeURIComponent(orgSlug)}`
        );
        return;
      }
      window.location.replace("/edit");
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 409 && code === "INVITE_LOGIN_REQUIRED") {
        setLoginRequired(true);
        setError("כבר יש לך חשבון. התחברו כדי לקבל את ההזמנה.");
      } else if (status === 404) {
        setError("הקישור אינו תקין או שפג תוקפו");
      } else if (status === 400) {
        setError("נדרשת סיסמא לקבלת ההזמנה");
      } else {
        setError("שגיאת שרת, נסו שוב מאוחר יותר");
      }
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "קבלת הזמנה",
      subtitle: "אם יש לכם כבר חשבון, התחברו. אם לא — הגדירו סיסמא ליצירת חשבון.",
      children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
        isNewUser && /* @__PURE__ */ jsx(
          Input,
          {
            label: "שם פרטי",
            type: "text",
            autoComplete: "given-name",
            value: firstName,
            onChange: (e) => setFirstName(e.target.value),
            required: true
          }
        ),
        /* @__PURE__ */ jsx(
          Input,
          {
            label: "סיסמא (רק לחשבון חדש)",
            type: "password",
            autoComplete: "new-password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            onBlur: () => {
              if (isNewUser) setPasswordTouched(true);
            },
            minLength: PASSWORD_POLICY.minLength,
            maxLength: PASSWORD_POLICY.maxLength,
            meta: isNewUser ? PASSWORD_POLICY_HELPER_TEXT_HE : void 0,
            error: isNewUser ? passwordError : void 0
          }
        ),
        isNewUser && (passwordTouched || passwordError || password.length > 0) && /* @__PURE__ */ jsx(
          "ul",
          {
            className: styles.pwChecklist,
            "aria-label": "דרישות הסיסמה",
            children: getPasswordPolicyChecklist(password).map(
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
        isNewUser ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("label", { className: styles.consentRow, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: consent,
                onChange: (e) => setConsent(e.target.checked),
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
                checked: marketingConsent,
                onChange: (e) => setMarketingConsent(e.target.checked)
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: styles.consentText, children: [
              "אני רוצה לקבל עדכונים מ-Cardigo על trial, פרימיום ועדכונים חשובים",
              /* @__PURE__ */ jsx("span", { className: styles.marketingHint, children: "ניתן לבטל בכל עת" })
            ] })
          ] })
        ] }) : null,
        error2 && /* @__PURE__ */ jsx("p", { className: styles.error, children: error2 }),
        loginRequired ? /* @__PURE__ */ jsx("p", { className: styles.error, children: /* @__PURE__ */ jsx("a", { href: loginHref, children: "התחברו" }) }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", fullWidth: true, loading, children: "קבל הזמנה" })
      ] })
    }
  );
}
export {
  InviteAccept as default
};
