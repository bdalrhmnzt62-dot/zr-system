import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface Props {
  items: NavItem[];
  title: string;
  badge?: string;
  guard?: () => Promise<boolean>;
  redirectIfGuardFails?: string;
}

export function AppShell({ items, title, badge, guard, redirectIfGuardFails }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(!guard);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      if (guard) {
        const ok = await guard();
        if (cancelled) return;
        if (!ok) { navigate({ to: redirectIfGuardFails ?? "/auth" }); return; }
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Logo />
        </div>
        {badge && (
          <div className="px-4 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-2.5 py-1 text-[10px] font-semibold text-sidebar-accent-foreground">
              {badge}
            </span>
          </div>
        )}
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="ms-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <Logo />
              <button onClick={() => setOpen(false)} className="text-sidebar-foreground"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                    )}
                  >
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-sidebar-border p-3">
              <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-sidebar-foreground/80">
                <LogOut className="ms-2 h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="md:hidden"><Menu className="h-5 w-5" /></button>
            <h1 className="text-base font-bold md:text-lg">{title}</h1>
          </div>
          <div className="md:hidden"><Logo /></div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
