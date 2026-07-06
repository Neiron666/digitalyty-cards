import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ChunkErrorBoundary from "./ChunkErrorBoundary";
import RouteFallback from "./RouteFallback";
import { useAuth } from "../context/AuthContext";
import SeoHelmet from "../components/seo/SeoHelmet";

// pages
import Home from "../pages/Home";
import Contact from "../pages/Contact";
import Blog from "../pages/Blog";
import Pricing from "../pages/Pricing";
import Guides from "../pages/Guides";
import Cards from "../pages/Cards";
import BlogPost from "../pages/BlogPost";
import GuidePost from "../pages/GuidePost";

// legal
import Privacy from "../pages/Privacy";
import Terms from "../pages/Terms";
import Accessibility from "../pages/Accessibility";
import PaymentPolicy from "../pages/PaymentPolicy";

// auth
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const InviteAccept = lazy(() => import("../pages/InviteAccept"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const SignupLinkRequest = lazy(() => import("../pages/SignupLinkRequest"));
const SignupConsume = lazy(() => import("../pages/SignupConsume"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail"));
const Unsubscribe = lazy(() => import("../pages/Unsubscribe"));

// product
const Dashboard = lazy(() => import("../pages/Dashboard"));
const EditCard = lazy(() => import("../pages/EditCard"));
const Admin = lazy(() => import("../pages/Admin"));
const OrgInvites = lazy(() => import("../pages/OrgInvites"));
const Inbox = lazy(() => import("../pages/Inbox"));

// public card — PublicCard is eagerly imported for SSR-hydrated routes (/card/:slug, /c/:orgSlug/:slug).
// Using React.lazy + Suspense here causes hydrateRoot mismatch: SSR renderToString does not
// emit Suspense boundary markers (<!--$-->), so hydrateRoot cannot reconcile the Suspense fiber.
import PublicCard from "../pages/PublicCard";
const PreviewCard = lazy(() => import("../pages/PreviewCard"));
import NotFound from "../pages/NotFound";

// payment
const CheckoutPage = lazy(() => import("../pages/payment/CheckoutPage"));
const IframeReturnPage = lazy(
    () => import("../pages/payment/IframeReturnPage"),
);

function RequireAuth({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <RouteFallback label="טוען…" />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}

function AdminRouteGate() {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <>
                <SeoHelmet robots="noindex, nofollow" />
                <RouteFallback label="טוען…" />
            </>
        );
    }
    if (user?.role !== "admin") {
        return (
            <>
                <SeoHelmet robots="noindex, nofollow" />
                <NotFound />
            </>
        );
    }

    return (
        <>
            <SeoHelmet robots="noindex, nofollow" />
            <ChunkErrorBoundary label="שגיאה בטעינת הדף">
                <Suspense fallback={<RouteFallback label="הדף נטען…" />}>
                    <Admin />
                </Suspense>
            </ChunkErrorBoundary>
        </>
    );
}

const routes = [
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
            { path: "payment-policy", element: <PaymentPolicy /> },

            // auth
            {
                path: "login",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בכניסה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <Login />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "register",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בהרשמה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <Register />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "invite",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בהזמנה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <InviteAccept />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "forgot-password",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <ForgotPassword />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "reset-password",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <ResetPassword />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "signup-link",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <SignupLinkRequest />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "signup",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <SignupConsume />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "verify-email",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <VerifyEmail />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "unsubscribe",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה">
                        <Suspense fallback={<RouteFallback label="טוען…" />}>
                            <Unsubscribe />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },

            // product
            {
                path: "dashboard",
                element: (
                    <ChunkErrorBoundary label="שגיאת טעינה בלוח הבקרה">
                        <Suspense
                            fallback={<RouteFallback label="טוען לוח בקרה…" />}
                        >
                            <Dashboard />
                        </Suspense>
                    </ChunkErrorBoundary>
                ),
            },
            {
                path: "inbox",
                element: (
                    <RequireAuth>
                        <ChunkErrorBoundary label="שגיאת טעינה בהודעות">
                            <Suspense
                                fallback={
                                    <RouteFallback label="טוען הודעות…" />
                                }
                            >
                                <Inbox />
                            </Suspense>
                        </ChunkErrorBoundary>
                    </RequireAuth>
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
        // SSR_HYDRATION: no Suspense wrapper — SSR produces no Suspense markers;
        // hydrateRoot requires structural match. ChunkErrorBoundary is render-neutral
        // on success path (returns children directly, no DOM wrapper).
        path: "/card/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <PublicCard />
            </ChunkErrorBoundary>
        ),
    },
    {
        // Standalone company card page (no marketing Header/Footer)
        // SSR_HYDRATION: no Suspense wrapper — SSR produces no Suspense markers;
        // hydrateRoot requires structural match. ChunkErrorBoundary is render-neutral
        // on success path (returns children directly, no DOM wrapper).
        path: "/c/:orgSlug/:slug",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בכרטיס">
                <PublicCard />
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
    {
        // Standalone checkout page (no marketing Header/Footer)
        path: "/payment/checkout",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה בדף התשלום">
                <Suspense fallback={<RouteFallback label="טוען דף תשלום…" />}>
                    <CheckoutPage />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
    {
        // Standalone iframe return relay page (no marketing Header/Footer)
        path: "/payment/iframe-return",
        element: (
            <ChunkErrorBoundary label="שגיאת טעינה">
                <Suspense fallback={<RouteFallback label="טוען…" />}>
                    <IframeReturnPage />
                </Suspense>
            </ChunkErrorBoundary>
        ),
    },
];

export default routes;
