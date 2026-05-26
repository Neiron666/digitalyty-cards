import { a as api } from "../entry-server.js";
async function getAccountSummary() {
  const res = await api.get("/account/me");
  return res.data;
}
async function changePassword({ currentPassword, newPassword }) {
  await api.post("/account/change-password", {
    currentPassword,
    newPassword
  });
  return true;
}
async function deleteAccount({ confirm, password }) {
  try {
    await api.post("/account/delete-account", { confirm, password });
    return { ok: true };
  } catch (err) {
    if (err?.response?.status === 409) {
      return err.response.data;
    }
    throw err;
  }
}
async function updateEmailPreferences({
  emailMarketingConsent,
  source = "settings_panel"
}) {
  const res = await api.patch("/account/email-preferences", {
    emailMarketingConsent,
    source
  });
  return res.data;
}
async function updateAccountName({ firstName }) {
  const res = await api.patch("/account/name", { firstName });
  return res.data;
}
async function cancelRenewal() {
  const res = await api.post("/account/cancel-renewal");
  return res.data;
}
async function resumeAutoRenewal() {
  const res = await api.post("/account/resume-auto-renewal");
  return res.data;
}
async function deletePaymentMethod() {
  const res = await api.post("/account/delete-payment-method");
  return res.data;
}
async function getReceipts(limit = 10) {
  const res = await api.get("/account/receipts", { params: { limit } });
  return res.data;
}
async function updateReceiptProfile(fields) {
  const res = await api.patch("/account/receipt-profile", fields);
  return res.data;
}
export {
  getReceipts as a,
  cancelRenewal as b,
  changePassword as c,
  deleteAccount as d,
  deletePaymentMethod as e,
  updateReceiptProfile as f,
  getAccountSummary as g,
  updateAccountName as h,
  resumeAutoRenewal as r,
  updateEmailPreferences as u
};
