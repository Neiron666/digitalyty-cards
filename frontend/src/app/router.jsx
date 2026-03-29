import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ChunkErrorBoundary from "./ChunkErrorBoundary";
import RouteFallback from "./RouteFallback";
import { useAuth } from "../context/AuthContext";

// pages
import Home from "../pages/Home";
import Contact from "../pages/Contact";
import Blog from "../pages/Blog";
import Pricing from "../pages/Pricing";
import Guides from "../pages/Guides";
import Cards from "../pages/Cards";

// legal
import Privacy from "../pages/Privacy";
import Terms from "../pages/Terms";
import Accessibility from "../pages/Accessibility";

// auth
import Login from "../pages/Login";
import Register from "../pages/Register";
import InviteAccept from "../pages/InviteAccept";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import SignupLinkRequest from "../pages/SignupLinkRequest";
import SignupConsume from "../pages/SignupConsume";
import VerifyEmail from "../pages/VerifyEmail";

// product
import Dashboard from "../pages/Dashboard";
const EditCard = lazy(() => import("../pages/EditCard"));
const Admin = lazy(() => import("../pages/Admin"));
const OrgInvites = lazy(() => import("../pages/OrgInvites"));
const Inbox = lazy(() => import("../pages/Inbox"));
const BlogPost = lazy(() => import("../pages/BlogPost"));
const GuidePost = lazy(() => import("../pages/GuidePost"));

// public card
const PublicCard = lazy(() => import("../pages/PublicCard"));
const PreviewCard = lazy(() => import("../pages/PreviewCard"));
import NotFound from "../pages/NotFound";

function AdminRouteGate() {
    const { user } = useAuth();
    if (user?.role !== "admin") return <NotFound />;

    return (
        <ChunkErrorBoundary label="שגיאה בטעינת הדף">
            <Suspense fallback={<RouteFallback label="הדף נטען…" />}>
                <Admin />
            </Suspense>
        </ChunkErrorBoundary>
    );
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            { index: true, element: <Home /> },

            // marketing pages
            { path: "contact", element: <Contact /> },
            { path: "blog", element: <Blog /> },
            { path: "blog/page/:pageNum", element: <Blog /> },
            {
                path: "blog/:slug",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה במאמר">
                        <Suspense
                            fallback={<RouteFallback label="טוען מאמר…" />}
                        >
                            <BlogPost />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            { path: "pricing", element: <Pricing /> },
            { path: "guides", element: <Guides /> },
            { path: "guides/page/:pageNum", element: <Guides /> },
            {
                path: "guides/:slug",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה במדריך">
                        <Suspense
                            fallback={<RouteFallback label="טוען מדריך…" />}
                        >
                            <GuidePost />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            { path: "cards", element: <Cards /> },

            // legal
            { path: "privacy", element: <Privacy /> },
            { path: "terms", element: <Terms /> },
            { path: "accessibility-statement", element: <Accessibility /> },

            // auth
            { path: "login", element: <Login /> },
            { path: "register", element: <Register /> },
            { path: "invite", element: <InviteAccept /> },
            { path: "forgot-password", element: <ForgotPassword /> },
            { path: "reset-password", element: <ResetPassword /> },
            { path: "signup-link", element: <SignupLinkRequest /> },
            { path: "signup", element: <SignupConsume /> },
            { path: "verify-email", element: <VerifyEmail /> },

            // product
            { path: "dashboard", element: <Dashboard /> },
            {
                path: "inbox",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בהודעות">
                        <Suspense
                            fallback={<RouteFallback label="טוען הודעות…" />}
                        >
                            <Inbox />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "org/invites",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בהזמנות הארגון">
                        <Suspense
                            fallback={<RouteFallback label="טוען הזמנות…" />}
                        >
                            <OrgInvites />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "edit/:section?/:tab?",
                element: (
                    <ChunkErrorBoundary label="שגיאה בטעינת הדף">
                        <Suspense
                            fallback={<RouteFallback label="הדף נטען…" />}
                        >
                            <EditCard />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },

            // admin (not linked in UI)
            {
                path: "admin",
                element: <AdminRouteGate />,
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
    {
        // Standalone preview personal card page (no marketing Header/Footer)
        path: "/preview/card/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <Suspense fallback={<RouteFallback label="טוען כרטיס…" />}>
                    <PreviewCard />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
    {
        // Standalone preview company card page (no marketing Header/Footer)
        path: "/preview/c/:orgSlug/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <Suspense fallback={<RouteFallback label="טוען כרטיס…" />}>
                    <PreviewCard />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
]);

export default router;
