import { useEffect, useRef, useState } from "react";

/**
 * Detects install-prompt availability, installed state, and platform hints.
 *
 * Chromium path: captures `beforeinstallprompt`, exposes `triggerPrompt()`.
 * iOS Safari path: exposes `showIOSGuide`.
 * In-app / unsupported: exposes `isInAppBrowser`.
 * Already installed: `isInstalled` is true → consumer should render nothing.
 */
export default function useInstallPrompt() {
    const deferredPrompt = useRef(null);

    const [canPrompt, setCanPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window === "undefined") return false;
        // iOS standalone check
        if (navigator.standalone === true) return true;
        // Chromium / Firefox standalone check
        if (
            window.matchMedia &&
            window.matchMedia("(display-mode: standalone)").matches
        ) {
            return true;
        }
        return false;
    });

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
        }

        function onAppInstalled() {
            deferredPrompt.current = null;
            setCanPrompt(false);
            setIsInstalled(true);
        }

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onAppInstalled);

        // Also listen for display-mode changes (e.g. user installed while page open)
        const mql = window.matchMedia?.("(display-mode: standalone)");
        function onDisplayModeChange(e) {
            if (e.matches) setIsInstalled(true);
        }
        mql?.addEventListener?.("change", onDisplayModeChange);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onAppInstalled);
            mql?.removeEventListener?.("change", onDisplayModeChange);
        };
    }, []);

    async function triggerPrompt() {
        const prompt = deferredPrompt.current;
        if (!prompt) return;
        prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === "accepted") {
            setIsInstalled(true);
        }
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
