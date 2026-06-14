import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@agpe/shared/auth/useAuth";
import { Login } from "@/pages/auth/Login";
import { Callback } from "@/pages/auth/Callback";
import { StandsList } from "@/pages/volunteer/StandsList";
import { MyPlanning } from "@/pages/volunteer/MyPlanning";
import { Dashboard } from "@/pages/admin/Dashboard";
import { Events } from "@/pages/admin/Events";
import { Stands } from "@/pages/admin/Stands";
import { Slots } from "@/pages/admin/Slots";
import { Profile } from "@/pages/Profile";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Link } from "react-router-dom";
function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactElement;
  admin?: boolean;
}) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingSkeleton />;
  if (!user) return <Navigate to="/login" />;
  if (admin && role !== "admin") return <Navigate to="/volunteer/stands" />;
  return children;
}
function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t bg-white p-3 text-sm">
      <Link to="/volunteer/stands">🎯 Stands</Link>
      <Link to="/volunteer/planning">📅 Planning</Link>
      <Link to="/profil">👤 Profil</Link>
    </nav>
  );
}
export function AppRouter() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route
          path="/volunteer/stands"
          element={
            <RequireAuth>
              <>
                <StandsList />
                <BottomNav />
              </>
            </RequireAuth>
          }
        />
        <Route
          path="/volunteer/planning"
          element={
            <RequireAuth>
              <>
                <MyPlanning />
                <BottomNav />
              </>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth admin>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/events"
          element={
            <RequireAuth admin>
              <Events />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/stands"
          element={
            <RequireAuth admin>
              <Stands />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/slots"
          element={
            <RequireAuth admin>
              <Slots />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/volunteer/stands" />} />
      </Routes>
    </>
  );
}
