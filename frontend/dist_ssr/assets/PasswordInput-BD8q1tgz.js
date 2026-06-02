import { jsxs, jsx } from "react/jsx-runtime";
import { useId, useState } from "react";
import { F as FieldValidationMessage } from "./Input-CGCIIpQL.js";
const field = "_field_1jgbz_1";
const label = "_label_1jgbz_19";
const required = "_required_1jgbz_35";
const inputWrap = "_inputWrap_1jgbz_43";
const input = "_input_1jgbz_43";
const inputError = "_inputError_1jgbz_105";
const toggle = "_toggle_1jgbz_113";
const meta = "_meta_1jgbz_161";
const styles = {
  field,
  label,
  required,
  inputWrap,
  input,
  inputError,
  toggle,
  meta
};
function EyeIcon({ visible }) {
  if (visible) {
    return /* @__PURE__ */ jsxs(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        focusable: "false",
        children: [
          /* @__PURE__ */ jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }),
          /* @__PURE__ */ jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23" })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "20",
      height: "20",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      children: [
        /* @__PURE__ */ jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3" })
      ]
    }
  );
}
function PasswordInput({
  label: label2,
  value,
  onChange,
  autoComplete,
  required: required2 = false,
  error,
  meta: meta2,
  minLength,
  maxLength,
  onBlur,
  className = "",
  // Discard any caller-provided type — type is controlled internally
  // by the show/hide toggle and must never be overridden externally.
  type: _ignoredType,
  ...props
}) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const errorId = error ? `${uid}-err` : void 0;
  const metaId = meta2 ? `${uid}-meta` : void 0;
  const [showPassword, setShowPassword] = useState(false);
  const describedBy = [metaId, errorId].filter(Boolean).join(" ") || void 0;
  const inputClass = [styles.input, error ? styles.inputError : "", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs("div", { className: styles.field, children: [
    label2 && /* @__PURE__ */ jsxs("label", { htmlFor: inputId, className: styles.label, children: [
      label2,
      required2 && /* @__PURE__ */ jsx("span", { className: styles.required, children: "*" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles.inputWrap, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          ...props,
          id: inputId,
          className: inputClass,
          type: showPassword ? "text" : "password",
          value,
          onChange,
          autoComplete,
          required: required2,
          minLength,
          maxLength,
          onBlur,
          "aria-invalid": error ? true : void 0,
          "aria-describedby": describedBy
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles.toggle,
          "aria-label": showPassword ? "הסתר סיסמה" : "הצג סיסמה",
          "aria-pressed": showPassword,
          onClick: () => setShowPassword((v) => !v),
          children: /* @__PURE__ */ jsx(EyeIcon, { visible: showPassword })
        }
      )
    ] }),
    meta2 && /* @__PURE__ */ jsx("span", { id: metaId, className: styles.meta, children: meta2 }),
    error && /* @__PURE__ */ jsx(FieldValidationMessage, { id: errorId, children: error })
  ] });
}
export {
  PasswordInput as P
};
