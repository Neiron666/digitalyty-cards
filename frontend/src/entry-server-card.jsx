/**
 * entry-server-card.jsx — SSR_P3_DEDICATED_CARD_SSR_RENDERER_MINIMAL
 *
 * Dedicated SSR entry for public card routes only.
 * Eager-imports PublicCard so renderToString resolves full card content
 * (avoids the React.lazy Suspense fallback from generic entry-server.jsx).
 *
 * Only defines the two public card route shapes:
 *   /card/:slug
 *   /c/:orgSlug/:slug
 *
 * Does NOT import Admin/EditCard/Dashboard/Auth/product routes.
 * Does NOT fetch backend data.
 * Does NOT create the data island (caller's responsibility).
 * Does NOT require AuthProvider or UnreadCountProvider.
 *
 * Returns { html, helmetContext } — caller assembles the final page.
 */

import { renderToString } from "react-dom/server";
import {
    createStaticHandler,
    createStaticRouter,
    StaticRouterProvider,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Eager import — must NOT be lazy() to ensure renderToString resolves the component.
import PublicCard from "./pages/PublicCard";

import { InitialDetailDataProvider } from "./seo/initialDetailData";

// Minimal route config for card SSR: only the two public card route shapes.
// useParams() inside PublicCard will extract { slug } or { orgSlug, slug } correctly.
const cardRoutes = [
    { path: "/card/:slug", element: <PublicCard /> },
    { path: "/c/:orgSlug/:slug", element: <PublicCard /> },
];

/**
 * Render a public card route to an HTML string for SSR.
 *
 * @param {string} url - Absolute path starting with "/", e.g. "/card/my-slug"
 * @param {object} [options]
 * @param {object} [options.initialDetailData] - Pre-keyed card DTO map from SSR function.
 *   Shape: { "card/slug": publicDto } or { "c/orgSlug/slug": publicDto }
 * @returns {Promise<{ html: string, helmetContext: object }>}
 */
export async function renderCardRoute(url, options = {}) {
    if (typeof url !== "string" || !url.startsWith("/")) {
        throw new TypeError(
            `renderCardRoute: url must be a string starting with "/", got: ${JSON.stringify(url)}`,
        );
    }

    const handler = createStaticHandler(cardRoutes);
    const request = new Request("https://cardigo.co.il" + url);
    const context = await handler.query(request);

    // Redirect responses are returned as a structured marker for the caller.
    if (context instanceof Response) {
        throw context;
    }

    const router = createStaticRouter(cardRoutes, context);
    const helmetContext = {};
    const initialDetailData =
        options && typeof options === "object" && options.initialDetailData
            ? options.initialDetailData
            : {};

    const html = renderToString(
        <HelmetProvider context={helmetContext}>
            <InitialDetailDataProvider value={initialDetailData}>
                <StaticRouterProvider router={router} context={context} />
            </InitialDetailDataProvider>
        </HelmetProvider>,
    );

    return { html, helmetContext };
}
