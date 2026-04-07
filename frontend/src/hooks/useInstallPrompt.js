import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detects install-prompt availability, installed state, and platform hints.
 *
 * Chromium path: captures `beforeinstallprompt`, exposes `triggerPrompt()`.
 * iOS Safari path: exposes `showIOSGuide`.
 * In-app / unsupported: exposes `isInAppBrowser`.
 * Already installed: `isInstalled` derived from real browser signals.
 *
 * Lifecycle: installed state is re-synced from real browser signals on
 * display-mode changes, tab visibility, pageshow, and focus so that
 * uninstall→return-to-site correctly resets the latch.
 */

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

export default function useInstallPrompt() {
    const deferredPrompt = useRef(null);

    const [canPrompt, setCanPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(checkStandalone);

    const syncInstalledState = useCallback(() => {
        setIsInstalled(checkStandalone());
    }, []);

    const [platform] = useState(() => {
        if (typeof navigator === "undefined") {
            return { isIOS: false, isSafari: false, isInAppBrowser: false };
        }

        const ua = navigator.userAgent || "";

        const isIOS =
            /iPad|iPhone|iPod/.test(ua) &&
            !(/** @type {any} */ (window).MSStream);

        const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

        const isInAppBrowser =
            /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|LinkedIn/i.test(ua);

        return { isIOS, isSafari, isInAppBrowser };
    });

    useEffect(() => {
        function onBeforeInstall(e) {
            e.preventDefault();
            deferredPrompt.current = e;
            setCanPrompt(true);
            // If browser fires this event the app is not currently installed
            setIsInstalled(false);
        }

        function onAppInstalled() {
            deferredPrompt.current = null;
            setCanPrompt(false);
            setIsInstalled(true);
        }

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onAppInstalled);

        // Display-mode: handle BOTH directions (install AND uninstall)
        const mql = window.matchMedia?.("(display-mode: standalone)");
        function onDisplayModeChange(e) {
            setIsInstalled(e.matches);
        }
        mql?.addEventListener?.("change", onDisplayModeChange);

        // Re-sync installed truth when user returns to the tab/page
        function onResync() {
            syncInstalledState();
        }
        window.addEventListener("pageshow", onResync);
        document.addEventListener("visibilitychange", onResync);
        window.addEventListener("focus", onResync);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onAppInstalled);
            mql?.removeEventListener?.("change", onDisplayModeChange);
            window.removeEventListener("pageshow", onResync);
            document.removeEventListener("visibilitychange", onResync);
            window.removeEventListener("focus", onResync);
        };
    }, [syncInstalledState]);

    async function triggerPrompt() {
        const prompt = deferredPrompt.current;
        if (!prompt) return;
        prompt.prompt();
        const result = await prompt.userChoice;
        // Do NOT optimistically set isInstalled here.
        // Let the appinstalled event / syncInstalledState establish real truth.
        deferredPrompt.current = null;
        setCanPrompt(false);
    }

    const showIOSGuide =
        platform.isIOS && platform.isSafari && !isInstalled && !canPrompt;

    return {
        canPrompt,
        triggerPrompt,
        isInstalled,
        isIOS: platform.isIOS,
        isSafari: platform.isSafari,
        isInAppBrowser: platform.isInAppBrowser,
        showIOSGuide,
    };
}
