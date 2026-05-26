import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UnreadCountProvider } from "./context/UnreadCountContext";
import router from "./app/router";
import "./lib/installPromptStore"; // early init — capture beforeinstallprompt before lazy routes
import "./styles/globals.css";
import "./styles/tour.css";

const app = (
    <HelmetProvider>
        <StrictMode>
            <AuthProvider>
                <UnreadCountProvider>
                    <RouterProvider router={router} />
                </UnreadCountProvider>
            </AuthProvider>
        </StrictMode>
    </HelmetProvider>
);

const rootEl = document.getElementById("root");

if (!rootEl) {
    throw new Error("Cardigo bootstrap failed: missing #root element.");
}

if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, app);
} else {
    createRoot(rootEl).render(app);
}
