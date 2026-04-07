import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UnreadCountProvider } from "./context/UnreadCountContext";
import router from "./app/router";
import "./lib/installPromptStore"; // early init — capture beforeinstallprompt before lazy routes
import "./styles/globals.css";

createRoot(document.getElementById("root")).render(
    <HelmetProvider>
        <StrictMode>
            <AuthProvider>
                <UnreadCountProvider>
                    <RouterProvider router={router} />
                </UnreadCountProvider>
            </AuthProvider>
        </StrictMode>
    </HelmetProvider>,
);
