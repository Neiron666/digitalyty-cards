import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";

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
import EditCard from "../pages/EditCard";
import Admin from "../pages/Admin";

// public card
import PublicCard from "../pages/PublicCard";
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
            { path: "edit/:section?/:tab?", element: <EditCard /> },

            // admin (not linked in UI)
            { path: "admin", element: <Admin /> },

            // fallback
            { path: "*", element: <NotFound /> },
        ],
    },
    {
        // Standalone public card page (no marketing Header/Footer)
        path: "/card/:slug",
        element: <PublicCard />,
    },
]);

export default router;
