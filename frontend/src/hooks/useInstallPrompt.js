import { useSyncExternalStore, useEffect, useState } from "react";
import {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    triggerPrompt,
} from "../lib/installPromptStore";

/**
 * Detects install-prompt availability, installed state, and platform hints.
 *
 * Delegates event capture and lifecycle tracking to the shared
 * installPromptStore (module-level listeners, always-on).
 * This hook only subscribes to the store and adds platform detection.
 *
 * Consumer API is unchanged:
 *   canPrompt, triggerPrompt, isInstalled,
 *   isIOS, isSafari, isInAppBrowser, showIOSGuide
 *
 * Hydration safety: beforeinstallprompt can fire before hydrateRoot on
 * tab reload (Chrome caches PWA installability from the first load), mutating
 * the store to canPrompt=true while SSR rendered canPrompt=false. This causes
 * React useSyncExternalStore tearing → #418/#425. The mounted gate ensures
 * the first client render matches SSR; real values are exposed post-hydration.
 */

export default function useInstallPrompt() {
    // All hooks called unconditionally — hook order never changes.
    const { canPrompt, isInstalled } = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

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

    // Hydration gate: false on SSR and during the first client render (hydration
    // pass). Set to true in useEffect, which runs only after hydrateRoot commits.
    // This guarantees the first client render matches the server snapshot
    // regardless of when beforeinstallprompt fires.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Before mount: return SSR-equivalent values so the hydration render
    // matches the server HTML. triggerPrompt is always the real callable.
    if (!mounted) {
        return {
            canPrompt: false,
            triggerPrompt,
            isInstalled: false,
            isIOS: false,
            isSafari: false,
            isInAppBrowser: false,
            showIOSGuide: false,
        };
    }

    // After mount: real install-prompt/platform values for interactive use.
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
