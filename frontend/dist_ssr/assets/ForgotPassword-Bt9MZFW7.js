import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { A as AuthLayout } from "./AuthLayout-D5oAbuh9.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { B as Button, f as forgotPassword } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const form = "_form_1w3gu_1";
const message = "_message_1w3gu_13";
const error = "_error_1w3gu_25";
const doneBlock = "_doneBlock_1w3gu_37";
const spamHint = "_spamHint_1w3gu_49";
const cooldownHint = "_cooldownHint_1w3gu_61";
const styles = {
  form,
  message,
  error,
  doneBlock,
  spamHint,
  cooldownHint
};
const RESEND_COOLDOWN_SEC = 180;
const COOLDOWN_STORAGE_KEY = "cardigo_forgot_cooldown_until";
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef(null);
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  function safeWriteCooldown() {
    try {
      localStorage.setItem(
        COOLDOWN_STORAGE_KEY,
        String(Date.now() + RESEND_COOLDOWN_SEC * 1e3)
      );
    } catch {
    }
  }
  function safeReadCooldownMs() {
    try {
      return Number(localStorage.getItem(COOLDOWN_STORAGE_KEY)) || 0;
    } catch {
      return 0;
    }
  }
  function safeClearCooldown() {
    try {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    } catch {
    }
  }
  function startCountdown(initialSec = RESEND_COOLDOWN_SEC) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(initialSec);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          safeClearCooldown();
          return 0;
        }
        return prev - 1;
      });
    }, 1e3);
  }
  useEffect(() => {
    const until = safeReadCooldownMs();
    const remainingMs = until - Date.now();
    if (remainingMs > 0) {
      const remainingSec = Math.ceil(remainingMs / 1e3);
      setDone(true);
      startCountdown(remainingSec);
    } else {
      safeClearCooldown();
    }
  }, []);
  async function handleSubmit(e) {
    e.preventDefault();
    if (countdown > 0) return;
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setDone(true);
      safeWriteCooldown();
      startCountdown();
    } catch (err) {
      setError("לא ניתן לשלוח קישור כרגע. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsx(
    AuthLayout,
    {
      title: "איפוס סיסמה",
      subtitle: "הזן/י את כתובת האימייל שלך ונשלח קישור לאיפוס סיסמה.",
      footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/login", children: "חזרה להתחברות" }) }),
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
        done ? /* @__PURE__ */ jsxs("div", { className: styles.doneBlock, children: [
          /* @__PURE__ */ jsx("p", { className: styles.message, children: "אם קיים חשבון עם האימייל הזה, נשלח קישור לאיפוס סיסמה." }),
          /* @__PURE__ */ jsx("p", { className: styles.spamHint, children: "לא מוצאים את המייל? בדוק/י גם בתיקיית הספאם (Spam / Junk)." }),
          countdown > 0 ? /* @__PURE__ */ jsxs("p", { className: styles.cooldownHint, children: [
            "ניתן לשלוח שוב בעוד ",
            countdown,
            " שניות."
          ] }) : /* @__PURE__ */ jsx("p", { className: styles.cooldownHint, children: "לא קיבלת? ניתן לנסות שוב." })
        ] }) : null,
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            fullWidth: true,
            loading,
            disabled: countdown > 0,
            children: "שלח קישור"
          }
        )
      ] })
    }
  );
}
export {
  ForgotPassword as default
};
