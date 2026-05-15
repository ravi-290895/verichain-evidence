import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Upload, ShieldCheck, Database, ScrollText, Users, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/WalletButton";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Register Evidence", icon: Upload, roles: ["officer", "admin"] },
  { to: "/verify", label: "Verify", icon: ShieldCheck },
  { to: "/registry", label: "Registry", icon: Database },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["judge", "admin"] },
  { to: "/admin/users", label: "User Management", icon: Users, roles: ["admin"] },
];

export function AppLayout() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const visibleNav = navItems.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r as any)));

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-foreground tracking-tight">ChainCustody</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Evidence Registry</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[inset_0_0_12px_hsl(var(--primary)/0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2 rounded-md bg-secondary/40">
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="flex justify-end px-8 pt-6">
          <WalletButton />
        </div>
        <div className="px-8 pb-8 pt-2 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
