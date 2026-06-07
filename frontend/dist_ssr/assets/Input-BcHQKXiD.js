import { jsx, jsxs } from "react/jsx-runtime";
import { useId } from "react";
const field = "_field_1nzsd_1";
const label = "_label_1nzsd_19";
const required = "_required_1nzsd_35";
const input = "_input_1nzsd_43";
const error = "_error_1nzsd_83";
const meta = "_meta_1nzsd_91";
const styles$1 = {
  field,
  label,
  required,
  input,
  error,
  meta
};
const message = "_message_ukpej_11";
const styles = {
  message
};
function FieldValidationMessage({ id, children }) {
  if (!children) return null;
  return /* @__PURE__ */ jsx("span", { id, className: styles.message, children });
}
function Input({
  label: label2,
  type = "text",
  value,
  onChange,
  placeholder,
  meta: meta2,
  error: error2,
  required: required2 = false,
  className = "",
  ...props
}) {
  const uid = useId();
  const errorId = error2 ? `${uid}-err` : void 0;
  const inputClass = [styles$1.input, error2 ? styles$1.error : "", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs("label", { className: styles$1.field, children: [
    label2 && /* @__PURE__ */ jsxs("span", { className: styles$1.label, children: [
      label2,
      required2 && /* @__PURE__ */ jsx("span", { className: styles$1.required, children: "*" })
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        className: inputClass,
        type,
        value,
        onChange,
        placeholder,
        required: required2,
        ...props,
        "aria-invalid": error2 ? true : void 0,
        "aria-describedby": errorId
      }
    ),
    meta2 ? /* @__PURE__ */ jsx("span", { className: styles$1.meta, children: meta2 }) : null,
    error2 && /* @__PURE__ */ jsx(FieldValidationMessage, { id: errorId, children: error2 })
  ] });
}
export {
  FieldValidationMessage as F,
  Input as I
};
