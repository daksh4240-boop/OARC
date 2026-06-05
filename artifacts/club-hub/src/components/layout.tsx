import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Calendar, CheckSquare, ClipboardCheck, LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Members", href: "/members", icon: Users },
  { name: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, email, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-sidebar border-r">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl font-heading tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Users className="w-5 h-5" />
            </div>
            OARC
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Auth footer */}
        <div className="border-t border-sidebar-border p-4">
          {isAuthenticated ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground truncate px-1" title={email ?? ""}>
                {email}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-down drawer ── */}
      <div
        className={cn(
          "md:hidden fixed top-16 left-0 right-0 z-50 bg-background border-b shadow-lg transition-all duration-200 ease-in-out overflow-hidden",
          mobileOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <nav className="px-4 py-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Auth row inside drawer */}
        <div className="px-4 py-3 border-t">
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate max-w-[70%]">{email}</p>
              <Button variant="ghost" size="sm" onClick={() => { logout(); closeMobile(); }} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-1" /> Sign out
              </Button>
            </div>
          ) : (
            <Link href="/login" onClick={closeMobile}>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="md:pl-64 flex flex-col flex-1 w-full min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex h-16 items-center justify-between px-4 border-b bg-background z-50 sticky top-0">
          <div className="flex items-center gap-2 text-primary font-bold text-lg font-heading tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Users className="w-4 h-4" />
            </div>
            OARC
          </div>

          {/* Hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="flex items-center justify-center w-10 h-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
