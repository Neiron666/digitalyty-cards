import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ChunkErrorBoundary from "./ChunkErrorBoundary";
import RouteFallback from "./RouteFallback";

// pages
import Home from "../pages/Home";
import Contact from "../pages/Contact";
import Blog from "../pages/Blog";
import Pricing from "../pages/Pricing";
import Guides from "../pages/Guides";
import Cards from "../pages/Cards";

// auth
import Login from "../pages/Login";
import Register from "../pages/Register";

// product
import Dashboard from "../pages/Dashboard";
const EditCard = lazy(() => import("../pages/EditCard"));
const Admin = lazy(() => import("../pages/Admin"));

// public card
const PublicCard = lazy(() => import("../pages/PublicCard"));
import NotFound from "../pages/NotFound";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            { index: true, element: <Home /> },

            // marketing pages
            { path: "contact", element: <Contact /> },
            { path: "blog", element: <Blog /> },
            { path: "pricing", element: <Pricing /> },
            { path: "guides", element: <Guides /> },
            { path: "cards", element: <Cards /> },

            // auth
            { path: "login", element: <Login /> },
            { path: "register", element: <Register /> },

            // product
            { path: "dashboard", element: <Dashboard /> },
            {
                path: "edit/:section?/:tab?",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בעורך">
                        <Suspense
                            fallback={<RouteFallback label="טוען עורך…" />}
                        >
                            <EditCard />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },

            // admin (not linked in UI)
            {
                path: "admin",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה ב-Admin">
                        <Suspense
                            fallback={<RouteFallback label="טוען Admin…" />}
                        >
                            <Admin />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },

            // fallback
            { path: "*", element: <NotFound /> },
        ],
    },
    {
        // Standalone public card page (no marketing Header/Footer)
        path: "/card/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <Suspense fallback={<RouteFallback label="טוען כרטיס…" />}>
                    <PublicCard />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
    {
        // Standalone company card page (no marketing Header/Footer)
        path: "/c/:orgSlug/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <Suspense fallback={<RouteFallback label="טוען כרטיס…" />}>
                    <PublicCard />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
]);

export default router;
