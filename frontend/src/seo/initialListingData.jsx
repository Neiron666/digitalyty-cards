import { createContext, useContext } from "react";

const INITIAL_LISTING_DATA_ELEMENT_ID = "cardigo-initial-listing-data";

const EMPTY = Object.freeze({});

const InitialListingDataContext = createContext(EMPTY);

export function InitialListingDataProvider({ value, children }) {
    const safeValue =
        value && typeof value === "object" && !Array.isArray(value)
            ? value
            : EMPTY;
    return (
        <InitialListingDataContext.Provider value={safeValue}>
            {children}
        </InitialListingDataContext.Provider>
    );
}

export function useInitialListingData(key) {
    const ctx = useContext(InitialListingDataContext) || EMPTY;
    if (typeof key !== "string" || key.length === 0) return null;
    const v = ctx[key];
    return v === undefined ? null : v;
}

function isPlainObject(v) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
}

export function readInitialListingDataFromDocument() {
    if (typeof document === "undefined") return EMPTY;
    let el = null;
    try {
        el = document.getElementById(INITIAL_LISTING_DATA_ELEMENT_ID);
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

export { INITIAL_LISTING_DATA_ELEMENT_ID };
