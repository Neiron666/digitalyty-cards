import { createContext, useContext } from "react";

const INITIAL_DETAIL_DATA_ELEMENT_ID = "cardigo-initial-detail-data";

const EMPTY = Object.freeze({});

const InitialDetailDataContext = createContext(EMPTY);

export function InitialDetailDataProvider({ value, children }) {
    const safeValue =
        value && typeof value === "object" && !Array.isArray(value)
            ? value
            : EMPTY;
    return (
        <InitialDetailDataContext.Provider value={safeValue}>
            {children}
        </InitialDetailDataContext.Provider>
    );
}

export function useInitialDetailData(key) {
    const ctx = useContext(InitialDetailDataContext) || EMPTY;
    if (typeof key !== "string" || key.length === 0) return null;
    const v = ctx[key];
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    if (typeof v.slug !== "string" || v.slug.length === 0) return null;
    return v;
}

function isPlainObject(v) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
}

export function readInitialDetailDataFromDocument() {
    if (typeof document === "undefined") return EMPTY;
    let el = null;
    try {
        el = document.getElementById(INITIAL_DETAIL_DATA_ELEMENT_ID);
    } catch {
        return EMPTY;
    }
    if (!el) return EMPTY;
    const text = el.textContent;
    if (typeof text !== "string" || text.length === 0) return EMPTY;
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return EMPTY;
    }
    if (!isPlainObject(parsed)) return EMPTY;
    return parsed;
}

export { INITIAL_DETAIL_DATA_ELEMENT_ID };
