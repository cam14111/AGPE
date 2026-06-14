import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@agpe/shared/auth/useAuth";
export function PageHeader({ title }: { title: string }) {
  const { role, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b bg-white/95 p-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          to={role === "admin" ? "/admin/dashboard" : "/volunteer/stands"}
          className="font-bold text-indigo-600"
        >
          🎪 AGPE
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
        <nav className="hidden gap-3 text-sm md:flex">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/events">Événements</Link>
          <Link to="/admin/stands">Stands</Link>
          <Link to="/admin/slots">Créneaux</Link>
        </nav>
        <Button variant="outline" onClick={() => void signOut()}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
