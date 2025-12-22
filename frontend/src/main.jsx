import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import router from "./app/router";
import "./styles/globals.css";

createRoot(document.getElementById("root")).render(
    <HelmetProvider>
        <StrictMode>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </StrictMode>
    </HelmetProvider>
);
