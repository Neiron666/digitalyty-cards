import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

import path from "node:path";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Force env loading from the frontend project root (where .env.local lives).
    const envFromFiles = loadEnv(mode, __dirname, "VITE_");
    const publicOrigin =
        process.env.VITE_PUBLIC_ORIGIN ?? envFromFiles.VITE_PUBLIC_ORIGIN ?? "";
    const seoDebug =
        process.env.VITE_SEO_DEBUG ?? envFromFiles.VITE_SEO_DEBUG ?? "";

    // Print a one-line proof only when explicitly enabled.
    if (seoDebug === "1") {
        console.log(
            `[vite-env] mode=${mode} VITE_PUBLIC_ORIGIN=${publicOrigin || ""} VITE_SEO_DEBUG=${seoDebug || ""}`,
        );
    }

    return {
        plugins: [react()],

        // Ensure these are available in the client bundle even if the runtime /@vite/env endpoint
        // does not reflect them in this environment.
        define: {
            "import.meta.env.VITE_PUBLIC_ORIGIN": JSON.stringify(
                publicOrigin || "",
            ),
            "import.meta.env.VITE_SEO_DEBUG": JSON.stringify(seoDebug || ""),
        },

        server: {
            proxy: {
                "/api": {
                    target: "http://localhost:5000",
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
