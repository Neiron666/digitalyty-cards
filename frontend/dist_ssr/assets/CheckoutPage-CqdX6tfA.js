import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { g as getAccountSummary, f as updateReceiptProfile } from "./account.service-uDeHNjVm.js";
import { a as api, S as SeoHelmet, B as Button } from "../entry-server.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { N as Notice } from "./Notice-Rge9ZUBq.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
async function createPayment(plan, options = {}) {
  const body = { plan };
  if (options?.mode) body.mode = options.mode;
  const res = await api.post("/payments/create", body);
  return res.data;
}
const page = "_page_10fak_1";
const card = "_card_10fak_23";
const header = "_header_10fak_47";
const title = "_title_10fak_59";
const subtitle = "_subtitle_10fak_75";
const stepRow = "_stepRow_10fak_93";
const stepActive = "_stepActive_10fak_113";
const stepDone = "_stepDone_10fak_123";
const stepInactive = "_stepInactive_10fak_131";
const stepSep = "_stepSep_10fak_139";
const form = "_form_10fak_151";
const actions = "_actions_10fak_167";
const checkLabel = "_checkLabel_10fak_187";
const summaryRow = "_summaryRow_10fak_221";
const summaryLabel = "_summaryLabel_10fak_243";
const summaryValue = "_summaryValue_10fak_251";
const fallbackBlock = "_fallbackBlock_10fak_265";
const frameWrapper = "_frameWrapper_10fak_287";
const frame = "_frame_10fak_287";
const errorText = "_errorText_10fak_319";
const mutedText = "_mutedText_10fak_331";
const link = "_link_10fak_343";
const inlineLink = "_inlineLink_10fak_355";
const brandBlock = "_brandBlock_10fak_395";
const brandImg = "_brandImg_10fak_413";
const styles = {
  page,
  card,
  header,
  title,
  subtitle,
  stepRow,
  stepActive,
  stepDone,
  stepInactive,
  stepSep,
  form,
  actions,
  checkLabel,
  summaryRow,
  summaryLabel,
  summaryValue,
  fallbackBlock,
  frameWrapper,
  frame,
  errorText,
  mutedText,
  link,
  inlineLink,
  brandBlock,
  brandImg
};
const VALID_PLANS = ["monthly", "yearly"];
const PLAN_LABELS = {
  monthly: "₪29 לחודש",
  yearly: "₪299 לשנה"
};
function validateReceiptDraft(draft, accountEmail) {
  if (draft.name.trim().length > 200)
    return "שם מלא ארוך מדי (מקסימום 200 תווים).";
  if (draft.nameInvoice.trim().length > 200)
    return "שם לחשבונית ארוך מדי (מקסימום 200 תווים).";
  if (draft.email.trim() !== "") {
    if (draft.email.trim().length > 200) return 'כתובת דוא"ל ארוכה מדי.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      return 'כתובת דוא"ל אינה תקינה.';
  }
  if (draft.numberId.trim() !== "") {
    if (draft.numberId.trim().length > 32)
      return "מספר ת.ז / ח.פ ארוך מדי (מקסימום 32 תווים).";
    if (!/^[a-zA-Z0-9-]*$/.test(draft.numberId.trim()))
      return "מספר ת.ז / ח.פ מכיל תווים לא חוקיים.";
  }
  if (draft.address.trim().length > 300)
    return "כתובת ארוכה מדי (מקסימום 300 תווים).";
  if (draft.city.trim().length > 100)
    return "עיר ארוכה מדי (מקסימום 100 תווים).";
  if (draft.zipCode.trim().length > 20)
    return "מיקוד ארוך מדי (מקסימום 20 תווים).";
  if (!draft.name.trim() && !draft.nameInvoice.trim()) {
    return "נדרש שם לקבלה או שם עסק / שם לחשבונית לפני מעבר לתשלום.";
  }
  if (!draft.email.trim() && !(accountEmail ?? "").trim()) {
    return "נדרש דוא״ל לקבלה לפני מעבר לתשלום.";
  }
  return null;
}
function buildReceiptPayload(draft, clearNumberId, serverProfile) {
  const rp = serverProfile ?? null;
  const payload = {};
  const draftType = draft.recipientType || null;
  const serverType = rp?.recipientType ?? null;
  if (draftType !== serverType) payload.recipientType = draftType;
  const textFields = [
    "name",
    "nameInvoice",
    "email",
    "address",
    "city",
    "zipCode"
  ];
  for (const field of textFields) {
    const draftValue = draft[field].trim();
    const serverValue = (rp?.[field] ?? "").trim();
    if (draftValue !== serverValue) {
      payload[field] = draftValue === "" ? null : draftValue;
    }
  }
  if (clearNumberId) {
    payload.numberId = null;
  } else if (draft.numberId.trim() !== "") {
    payload.numberId = draft.numberId.trim();
  }
  return payload;
}
function CheckoutBrandMark() {
  return /* @__PURE__ */ jsx("div", { className: styles.brandBlock, "aria-label": "Cardigo", children: /* @__PURE__ */ jsxs("picture", { children: [
    /* @__PURE__ */ jsx(
      "source",
      {
        type: "image/webp",
        srcSet: "/images/brand-logo/cardigo-logo.webp"
      }
    ),
    /* @__PURE__ */ jsx(
      "img",
      {
        src: "/images/brand-logo/cardigo-logo.png",
        alt: "Cardigo",
        className: styles.brandImg,
        loading: "lazy",
        decoding: "async"
      }
    )
  ] }) });
}
function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const plan = searchParams.get("plan");
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState("");
  const [account, setAccount] = useState(null);
  const [step, setStep] = useState("receipt");
  const [draft, setDraft] = useState({
    recipientType: "",
    name: "",
    nameInvoice: "",
    email: "",
    numberId: "",
    address: "",
    city: "",
    zipCode: ""
  });
  const [clearNumberId, setClearNumberId] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receiptOk, setReceiptOk] = useState("");
  const [yearlyAck, setYearlyAck] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [iframeMisconfigured, setIframeMisconfigured] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  useEffect(() => {
    async function load() {
      try {
        const data = await getAccountSummary();
        setAccount(data);
        const rp = data?.receiptProfile ?? null;
        setDraft({
          recipientType: rp?.recipientType ?? "",
          name: rp?.name ?? "",
          nameInvoice: rp?.nameInvoice ?? "",
          email: rp?.email ?? "",
          numberId: "",
          address: rp?.address ?? "",
          city: rp?.city ?? "",
          zipCode: rp?.zipCode ?? ""
        });
      } catch (err) {
        if (err?.response?.status === 401) {
          setAccountError("auth");
        } else {
          setAccountError("error");
        }
      } finally {
        setAccountLoading(false);
      }
    }
    load();
  }, []);
  useEffect(() => {
    if (step !== "payment") return;
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "CARDIGO_PAYMENT_STATUS") return;
      const s = event.data?.status;
      if (s !== "success" && s !== "fail") return;
      setPaymentResult(s);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [step]);
  async function handleReceiptSave() {
    setReceiptError("");
    setReceiptOk("");
    const validErr = validateReceiptDraft(draft, account?.email ?? null);
    if (validErr) {
      setReceiptError(validErr);
      return;
    }
    const payload = buildReceiptPayload(
      draft,
      clearNumberId,
      account?.receiptProfile
    );
    if (Object.keys(payload).length === 0) {
      setReceiptOk("לא בוצעו שינויים.");
      return;
    }
    setReceiptBusy(true);
    try {
      const updated = await updateReceiptProfile(payload);
      setAccount((prev) => ({
        ...prev,
        receiptProfile: updated?.receiptProfile ?? prev?.receiptProfile
      }));
      setReceiptOk("פרטי החשבונית עודכנו.");
      setClearNumberId(false);
    } catch (err) {
      if (err?.response?.status === 429) {
        setReceiptError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
      } else {
        const msg = err?.response?.data?.message;
        if (typeof msg === "string" && msg.length < 200) {
          setReceiptError(msg);
        } else {
          setReceiptError("שמירת הפרטים נכשלה. נסו שנית.");
        }
      }
    } finally {
      setReceiptBusy(false);
    }
  }
  async function handleCreatePayment() {
    setPaymentBusy(true);
    setPaymentError("");
    setIframeMisconfigured(false);
    try {
      const data = await createPayment(plan, { mode: "iframe" });
      if (!data?.paymentUrl || !/^https:\/\//.test(data.paymentUrl)) {
        setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
        return;
      }
      setPaymentUrl(data.paymentUrl);
      setStep("payment");
    } catch (err) {
      if (err?.response?.status === 429) {
        setPaymentError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
      } else if (err?.response?.status === 400) {
        const msg = err?.response?.data?.message;
        if (typeof msg === "string" && msg.length < 200 && msg === "Iframe checkout is not configured") {
          setIframeMisconfigured(true);
          setPaymentError(
            "שירות התשלום אינו מוגדר כעת. ניתן לנסות פתיחה בחלון מלא."
          );
        } else if (typeof msg === "string" && msg.length < 200) {
          setPaymentError(msg);
        } else {
          setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
        }
      } else {
        setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
      }
    } finally {
      setPaymentBusy(false);
    }
  }
  async function handleExternalFallback() {
    if (paymentUrl) {
      window.location.assign(paymentUrl);
      return;
    }
    setPaymentBusy(true);
    setPaymentError("");
    try {
      const data = await createPayment(plan, { mode: "external" });
      if (data?.paymentUrl && /^https:\/\//.test(data.paymentUrl)) {
        window.location.assign(data.paymentUrl);
      } else {
        setPaymentError("לא ניתן לפתוח תשלום. נסו שנית.");
      }
    } catch {
      setPaymentError("לא ניתן לפתוח תשלום. נסו שנית.");
    } finally {
      setPaymentBusy(false);
    }
  }
  function setField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setReceiptError("");
    setReceiptOk("");
  }
  async function handleContinueToSummary() {
    const validErr = validateReceiptDraft(draft, account?.email ?? null);
    if (validErr) {
      setReceiptError(validErr);
      return;
    }
    const payload = buildReceiptPayload(
      draft,
      clearNumberId,
      account?.receiptProfile
    );
    if (Object.keys(payload).length === 0) {
      setReceiptOk("");
      setStep("summary");
      return;
    }
    setReceiptBusy(true);
    setReceiptError("");
    setReceiptOk("");
    try {
      const updated = await updateReceiptProfile(payload);
      setAccount((prev) => ({
        ...prev,
        receiptProfile: updated?.receiptProfile ?? prev?.receiptProfile
      }));
      setClearNumberId(false);
      setStep("summary");
    } catch (err) {
      if (err?.response?.status === 429) {
        setReceiptError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
      } else {
        const msg = err?.response?.data?.message;
        if (typeof msg === "string" && msg.length < 200) {
          setReceiptError(msg);
        } else {
          setReceiptError("שמירת הפרטים נכשלה. נסו שנית.");
        }
      }
    } finally {
      setReceiptBusy(false);
    }
  }
  if (!VALID_PLANS.includes(plan)) {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx("p", { className: styles.errorText, children: "תוכנית לא תקינה. אנא בחרו תוכנית מעמוד המחירים." }),
        /* @__PURE__ */ jsx("div", { className: styles.actions, children: /* @__PURE__ */ jsx(Link, { to: "/pricing", className: styles.link, children: "חזרה לעמוד המחירים" }) })
      ] })
    ] });
  }
  if (accountLoading) {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx("p", { className: styles.mutedText, children: "טוען פרטי חשבון..." })
      ] })
    ] });
  }
  if (accountError === "auth") {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx(Notice, { variant: "info", children: "יש להתחבר כדי להמשיך לתשלום." }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(Link, { to: "/login", className: styles.link, children: "כניסה" }),
          /* @__PURE__ */ jsx(Link, { to: "/register", className: styles.link, children: "הרשמה" })
        ] })
      ] })
    ] });
  }
  if (accountError === "error") {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx(Notice, { variant: "error", children: "אירעה שגיאה בטעינת הפרטים. נסו לרענן את הדף." })
      ] })
    ] });
  }
  const subExpiresAt = account?.subscription?.expiresAt ? new Date(account.subscription.expiresAt) : null;
  const isActiveSub = account?.subscription?.status === "active" && subExpiresAt !== null && subExpiresAt > /* @__PURE__ */ new Date();
  if (isActiveSub) {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsxs(Notice, { variant: "info", children: [
          "יש לך כבר מנוי פעיל. המנוי בתוקף עד",
          " ",
          subExpiresAt.toLocaleDateString("he-IL"),
          "."
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles.actions, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: () => navigate("/edit/card/settings"),
            children: "להגדרות הכרטיס"
          }
        ) })
      ] })
    ] });
  }
  if (step === "receipt") {
    const serverProfile = account?.receiptProfile ?? null;
    const showMasked = Boolean(serverProfile?.numberIdMasked);
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsxs("div", { className: styles.header, children: [
          /* @__PURE__ */ jsx("h1", { className: styles.title, children: "פרטי חשבונית" }),
          /* @__PURE__ */ jsx("p", { className: styles.subtitle, children: "יש לאשר פרטי קבלה לפני מעבר לתשלום. השינויים לא יחולו על קבלות שכבר הופקו." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.stepRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles.stepActive, children: "1. פרטי חשבונית" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepInactive, children: "2. סיכום" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepInactive, children: "3. תשלום" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.form, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "שם מלא",
              type: "text",
              value: draft.name,
              onChange: (e) => setField("name", e.target.value),
              placeholder: "שם מלא"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "שם לחשבונית",
              type: "text",
              value: draft.nameInvoice,
              onChange: (e) => setField("nameInvoice", e.target.value),
              placeholder: "שם כפי שיופיע בחשבונית"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: 'דוא"ל לחשבונית',
              type: "email",
              value: draft.email,
              onChange: (e) => setField("email", e.target.value),
              placeholder: 'כתובת דוא"ל'
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "ת.ז / ח.פ",
              type: "text",
              value: draft.numberId,
              onChange: (e) => setField("numberId", e.target.value),
              placeholder: "מספר זיהוי (אופציונלי)",
              meta: showMasked ? `מספר שמור: ${serverProfile.numberIdMasked}` : void 0
            }
          ),
          showMasked && /* @__PURE__ */ jsxs("label", { className: styles.checkLabel, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: clearNumberId,
                onChange: (e) => setClearNumberId(e.target.checked)
              }
            ),
            /* @__PURE__ */ jsx("span", { children: "מחיקת מספר הזיהוי השמור" })
          ] }),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "כתובת",
              type: "text",
              value: draft.address,
              onChange: (e) => setField("address", e.target.value),
              placeholder: "כתובת (אופציונלי)"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "עיר",
              type: "text",
              value: draft.city,
              onChange: (e) => setField("city", e.target.value),
              placeholder: "עיר (אופציונלי)"
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "מיקוד",
              type: "text",
              value: draft.zipCode,
              onChange: (e) => setField("zipCode", e.target.value),
              placeholder: "מיקוד (אופציונלי)"
            }
          )
        ] }),
        receiptError && /* @__PURE__ */ jsx(Notice, { variant: "error", children: receiptError }),
        receiptOk && /* @__PURE__ */ jsx(Notice, { variant: "success", children: receiptOk }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: handleReceiptSave,
              loading: receiptBusy,
              disabled: receiptBusy,
              children: "שמירת פרטים"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              onClick: handleContinueToSummary,
              loading: receiptBusy,
              disabled: receiptBusy,
              children: "המשך לסיכום"
            }
          )
        ] })
      ] })
    ] });
  }
  if (step === "summary") {
    const summaryReady = plan === "yearly" ? yearlyAck : true;
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx("div", { className: styles.header, children: /* @__PURE__ */ jsx("h1", { className: styles.title, children: "סיכום הזמנה" }) }),
        /* @__PURE__ */ jsxs("div", { className: styles.stepRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles.stepDone, children: "1. פרטי חשבונית" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepActive, children: "2. סיכום" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
          /* @__PURE__ */ jsx("span", { className: styles.stepInactive, children: "3. תשלום" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.summaryRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles.summaryLabel, children: "תוכנית:" }),
          /* @__PURE__ */ jsx("span", { className: styles.summaryValue, children: plan === "monthly" ? "חודשי" : "שנתי" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.summaryRow, children: [
          /* @__PURE__ */ jsx("span", { className: styles.summaryLabel, children: "מחיר:" }),
          /* @__PURE__ */ jsx("span", { className: styles.summaryValue, children: PLAN_LABELS[plan] })
        ] }),
        plan === "yearly" && /* @__PURE__ */ jsxs("label", { className: styles.checkLabel, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: yearlyAck,
              onChange: (e) => setYearlyAck(e.target.checked)
            }
          ),
          /* @__PURE__ */ jsxs("span", { children: [
            "אני מבין/ה שזה חיוב שנתי מתחדש בהתאם ל",
            /* @__PURE__ */ jsx(
              Link,
              {
                to: "/payment-policy",
                className: styles.inlineLink,
                children: "מדיניות התשלומים"
              }
            ),
            "."
          ] })
        ] }),
        paymentError && /* @__PURE__ */ jsx(Notice, { variant: "error", children: paymentError }),
        iframeMisconfigured && /* @__PURE__ */ jsxs("div", { className: styles.fallbackBlock, children: [
          /* @__PURE__ */ jsx("p", { className: styles.mutedText, children: "עמוד התשלום המוטמע אינו זמין כעת." }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              onClick: handleExternalFallback,
              loading: paymentBusy,
              disabled: paymentBusy,
              fullWidth: true,
              children: "פתיחה בחלון מלא"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setStep("receipt"),
              disabled: paymentBusy,
              children: "חזרה"
            }
          ),
          !iframeMisconfigured && /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              onClick: handleCreatePayment,
              loading: paymentBusy,
              disabled: paymentBusy || !summaryReady || Boolean(paymentUrl),
              children: "המשך לתשלום"
            }
          )
        ] })
      ] })
    ] });
  }
  if (paymentResult === "success") {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx(Notice, { variant: "success", children: "התשלום נשלח לאישור. נעדכן את החשבון לאחר קבלת אישור התשלום." }),
        /* @__PURE__ */ jsx("div", { className: styles.actions, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: () => navigate("/edit/card/settings"),
            children: "להגדרות הכרטיס"
          }
        ) })
      ] })
    ] });
  }
  if (paymentResult === "fail") {
    return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
      /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
      /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
        /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
        /* @__PURE__ */ jsx(Notice, { variant: "error", children: "התשלום לא הושלם. ניתן לנסות שנית." }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => {
                setPaymentError("");
                setPaymentResult(null);
                setStep("summary");
              },
              children: "חזרה לסיכום"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              onClick: handleExternalFallback,
              loading: paymentBusy,
              disabled: paymentBusy,
              children: "פתיחה בחלון מלא"
            }
          )
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: styles.page, children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsxs("div", { className: styles.card, children: [
      /* @__PURE__ */ jsx(CheckoutBrandMark, {}),
      /* @__PURE__ */ jsx("div", { className: styles.header, children: /* @__PURE__ */ jsx("h1", { className: styles.title, children: "תשלום מאובטח" }) }),
      /* @__PURE__ */ jsxs("div", { className: styles.stepRow, children: [
        /* @__PURE__ */ jsx("span", { className: styles.stepDone, children: "1. פרטי חשבונית" }),
        /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
        /* @__PURE__ */ jsx("span", { className: styles.stepDone, children: "2. סיכום" }),
        /* @__PURE__ */ jsx("span", { className: styles.stepSep, children: "›" }),
        /* @__PURE__ */ jsx("span", { className: styles.stepActive, children: "3. תשלום" })
      ] }),
      paymentError && /* @__PURE__ */ jsx(Notice, { variant: "error", children: paymentError }),
      /* @__PURE__ */ jsx("div", { className: styles.frameWrapper, children: /* @__PURE__ */ jsx(
        "iframe",
        {
          src: paymentUrl,
          title: "תשלום מאובטח",
          sandbox: "allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation",
          className: styles.frame
        }
      ) }),
      !paymentResult && /* @__PURE__ */ jsxs("div", { className: styles.fallbackBlock, children: [
        /* @__PURE__ */ jsx("p", { className: styles.mutedText, children: "אם עמוד התשלום אינו נטען, ניתן לפתוח אותו בחלון נפרד:" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: handleExternalFallback,
            loading: paymentBusy,
            disabled: paymentBusy,
            children: "פתיחה בחלון מלא"
          }
        )
      ] })
    ] })
  ] });
}
export {
  CheckoutPage as default
};
