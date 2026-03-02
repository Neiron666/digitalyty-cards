/**
 * Thin re-export — keeps existing `import useUnreadCount from "…/hooks/useUnreadCount"`
 * working while the real state + polling lives in UnreadCountContext.
 */
export { useUnreadCount as default } from "../context/UnreadCountContext";
