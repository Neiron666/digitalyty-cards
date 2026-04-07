/**
 * Shared install-prompt runtime store.
 *
 * Captures `beforeinstallprompt` at module-init time (import side-effect)
 * so the event is never lost — even when the first React consumer mounts
 * late (lazy route + async data fetch).
 *
 * Exposes subscribe / getSnapshot for useSyncExternalStore consumption
 * and a triggerPrompt() action.
 *
 * Lifecycle guarantees (carried forward from the hook-only era):
 *  - bidirectional display-mode MQL (install AND uninstall)
 *  - re-sync on pageshow / visibilitychange / focus
 *  - no optimistic accepted→installed — only real browser signals
 *  - beforeinstallprompt defensively clears isInstalled
 */

// ── helpers ──────────────────────────────────────────────────────────

function checkStandalone() {
    if (typeof window === "undefined") return false;
    if (typeof navigator !== "undefined" && navigator.standalone === true) {
        return true;
    }
    if (
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches
    ) {
        return true;
    }
    return false;
}

// ── module-level state ───────────────────────────────────────────────

let _deferredPrompt = null;
let _canPrompt = false;
let _isInstalled = checkStandalone();

let _snapshot = Object.freeze({ canPrompt: _canPrompt, isInstalled: _isInstalled });

const _listeners = new Set();

function _emit() {
    _snapshot = Object.freeze({ canPrompt: _canPrompt, isInstalled: _isInstalled });
    for (const fn of _listeners) fn();
}

function _syncInstalled() {
    const real = checkStandalone();
    if (real !== _isInstalled) {
        _isInstalled = real;
        _emit();
    }
}

// ── early global capture (runs once at import time) ──────────────────

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        _deferredPrompt = e;
        _canPrompt = true;
        _isInstalled = false;
        _emit();
    });

    window.addEventListener("appinstalled", () => {
        _deferredPrompt = null;
        _canPrompt = false;
        _isInstalled = true;
        _emit();
    });

    // Display-mode: handle BOTH directions (install AND uninstall)
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", (e) => {
        _isInstalled = e.matches;
        _emit();
    });

    // Re-sync installed truth when user returns to the tab / page
    window.addEventListener("pageshow", _syncInstalled);
    document.addEventListener("visibilitychange", _syncInstalled);
    window.addEventListener("focus", _syncInstalled);
}

// ── public API ───────────────────────────────────────────────────────

const _SERVER_SNAPSHOT = Object.freeze({ canPrompt: false, isInstalled: false });

export function subscribe(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
}

export function getSnapshot() {
    return _snapshot;
}

export function getServerSnapshot() {
    return _SERVER_SNAPSHOT;
}

export async function triggerPrompt() {
    const prompt = _deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    // Do NOT optimistically set isInstalled.
    // Let the appinstalled event / _syncInstalled establish real truth.
    _deferredPrompt = null;
    _canPrompt = false;
    _emit();
}
