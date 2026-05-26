const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 72
  // bcrypt truncates at ~72 bytes; hard max enforced server-side too.
});
const PASSWORD_POLICY_ERROR_CODES = Object.freeze({
  PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  PASSWORD_TOO_LONG: "PASSWORD_TOO_LONG",
  PASSWORD_CONTAINS_WHITESPACE: "PASSWORD_CONTAINS_WHITESPACE",
  PASSWORD_CONTAINS_NON_ASCII: "PASSWORD_CONTAINS_NON_ASCII",
  PASSWORD_MISSING_LOWERCASE: "PASSWORD_MISSING_LOWERCASE",
  PASSWORD_MISSING_UPPERCASE: "PASSWORD_MISSING_UPPERCASE",
  PASSWORD_MISSING_DIGIT: "PASSWORD_MISSING_DIGIT",
  PASSWORD_MISSING_SYMBOL: "PASSWORD_MISSING_SYMBOL"
});
const PASSWORD_POLICY_MESSAGES_HE = Object.freeze({
  PASSWORD_REQUIRED: "יש להזין סיסמה",
  PASSWORD_TOO_SHORT: "הסיסמה חייבת להכיל לפחות 8 תווים",
  PASSWORD_TOO_LONG: "הסיסמה יכולה להכיל עד 72 תווים",
  PASSWORD_CONTAINS_WHITESPACE: "אין להשתמש ברווחים בסיסמה",
  PASSWORD_CONTAINS_NON_ASCII: "יש להשתמש בתווים באנגלית בלבד",
  PASSWORD_MISSING_LOWERCASE: "יש להוסיף אות קטנה באנגלית",
  PASSWORD_MISSING_UPPERCASE: "יש להוסיף אות גדולה באנגלית",
  PASSWORD_MISSING_DIGIT: "יש להוסיף ספרה",
  PASSWORD_MISSING_SYMBOL: "יש להוסיף סימן מיוחד",
  GENERIC: "הסיסמה אינה עומדת בדרישות האבטחה"
});
const PASSWORD_POLICY_HELPER_TEXT_HE = "הסיסמה חייבת להכיל 8–72 תווים באנגלית בלבד, כולל אות גדולה, אות קטנה, ספרה וסימן מיוחד. אין להשתמש ברווחים.";
const PASSWORD_POLICY_REQUIREMENTS_HE = Object.freeze([
  Object.freeze({ id: "length", label: "8–72 תווים" }),
  Object.freeze({ id: "englishOnly", label: "תווים באנגלית בלבד" }),
  Object.freeze({ id: "lowercase", label: "אות קטנה באנגלית" }),
  Object.freeze({ id: "uppercase", label: "אות גדולה באנגלית" }),
  Object.freeze({ id: "digit", label: "ספרה" }),
  Object.freeze({ id: "symbol", label: "סימן מיוחד" }),
  Object.freeze({ id: "noWhitespace", label: "ללא רווחים" })
]);
const RE_PRINTABLE_ASCII = /^[\x21-\x7E]+$/;
const RE_LOWERCASE = /[a-z]/;
const RE_UPPERCASE = /[A-Z]/;
const RE_DIGIT = /[0-9]/;
const RE_SYMBOL = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/;
function validatePasswordPolicy(password) {
  if (typeof password !== "string" || password.length === 0) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_REQUIRED
    };
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_TOO_SHORT
    };
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_TOO_LONG
    };
  }
  if (/\s/.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_CONTAINS_WHITESPACE
    };
  }
  if (!RE_PRINTABLE_ASCII.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_CONTAINS_NON_ASCII
    };
  }
  if (!RE_LOWERCASE.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_LOWERCASE
    };
  }
  if (!RE_UPPERCASE.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_UPPERCASE
    };
  }
  if (!RE_DIGIT.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_DIGIT
    };
  }
  if (!RE_SYMBOL.test(password)) {
    return {
      ok: false,
      code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_SYMBOL
    };
  }
  return { ok: true, code: null };
}
function getPasswordPolicyMessage(code) {
  return PASSWORD_POLICY_MESSAGES_HE[code] ?? PASSWORD_POLICY_MESSAGES_HE.GENERIC;
}
function getPasswordPolicyChecklist(password) {
  const isString = typeof password === "string" && password.length > 0;
  const lengthMet = isString && password.length >= PASSWORD_POLICY.minLength && password.length <= PASSWORD_POLICY.maxLength;
  const englishOnlyMet = isString && RE_PRINTABLE_ASCII.test(password);
  const lowercaseMet = isString && RE_LOWERCASE.test(password);
  const uppercaseMet = isString && RE_UPPERCASE.test(password);
  const digitMet = isString && RE_DIGIT.test(password);
  const symbolMet = isString && RE_SYMBOL.test(password);
  const noWhitespaceMet = isString && !/\s/.test(password);
  return [
    {
      id: "length",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[0].label,
      met: lengthMet
    },
    {
      id: "englishOnly",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[1].label,
      met: englishOnlyMet
    },
    {
      id: "lowercase",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[2].label,
      met: lowercaseMet
    },
    {
      id: "uppercase",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[3].label,
      met: uppercaseMet
    },
    {
      id: "digit",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[4].label,
      met: digitMet
    },
    {
      id: "symbol",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[5].label,
      met: symbolMet
    },
    {
      id: "noWhitespace",
      label: PASSWORD_POLICY_REQUIREMENTS_HE[6].label,
      met: noWhitespaceMet
    }
  ];
}
export {
  PASSWORD_POLICY_HELPER_TEXT_HE as P,
  PASSWORD_POLICY as a,
  getPasswordPolicyMessage as b,
  getPasswordPolicyChecklist as g,
  validatePasswordPolicy as v
};
