import { useSyncExternalStore, useState } from "react";
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
 */

export default function useInstallPrompt() {
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
