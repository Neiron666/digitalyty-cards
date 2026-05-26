import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UnreadCountProvider } from "./context/UnreadCountContext";
import router from "./app/router";
import {
    InitialListingDataProvider,
    readInitialListingDataFromDocument,
} from "./seo/initialListingData";
import "./lib/installPromptStore"; // early init — capture beforeinstallprompt before lazy routes
import "./styles/globals.css";
import "./styles/tour.css";

const initialListingData = readInitialListingDataFromDocument();

const app = (
    <HelmetProvider>
        <StrictMode>
            <AuthProvider>
                <UnreadCountProvider>
                    <InitialListingDataProvider value={initialListingData}>
                        <RouterProvider router={router} />
                    </InitialListingDataProvider>
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
