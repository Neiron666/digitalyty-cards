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
import {
    InitialDetailDataProvider,
    readInitialDetailDataFromDocument,
} from "./seo/initialDetailData";
import "./lib/installPromptStore"; // early init — capture beforeinstallprompt before lazy routes
import "./styles/globals.css";
import "./styles/tour.css";

const initialListingData = readInitialListingDataFromDocument();
const initialDetailData = readInitialDetailDataFromDocument();

const app = (
    <HelmetProvider>
        <StrictMode>
            <AuthProvider>
                <UnreadCountProvider>
                    <InitialListingDataProvider value={initialListingData}>
                        <InitialDetailDataProvider value={initialDetailData}>
                            <RouterProvider router={router} />
                        </InitialDetailDataProvider>
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
