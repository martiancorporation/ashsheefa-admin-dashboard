import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import useAuthDataStore from "@/store/authStore";

export default function AuthWrapper({ children }) {
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const authData = useAuthDataStore((state) => state.authData);

    // This is now the only gate on /dashboard: the Next middleware that used to
    // decide this server-side (from the auth cookie) has no equivalent in a
    // static SPA, so the guard runs on the client. It covers both a cold load of
    // a dashboard URL without a session and auth being cleared while already
    // sitting on a dashboard page (e.g. logout in another tab).
    useEffect(() => {
        if (pathname.startsWith('/dashboard') && (!authData || !authData.access_token)) {
            setTimeout(() => {
                toast.warning("Please login to access this page", {
                    id: "please-login",
                });
            }, 1400);

            // Remember where they were headed (e.g. a link from an approval
            // email) so login can bring them straight back.
            navigate(`/?next=${encodeURIComponent(pathname + search)}`);
        }
    }, [pathname, search, authData, navigate]);

    if (pathname.startsWith('/dashboard') && (!authData || !authData.access_token)) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return children;
}
