import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell, type NavItem } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, KeyRound, Settings, Users } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw redirect({ to: "/app/dashboard" });
    return { user: data.user };
  },
  component: AdminLayout,
});

const items: NavItem[] = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/admin/licenses", label: "أكواد التفعيل", icon: KeyRound },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

function AdminLayout() {
  return (
    <AppShell
      items={items}
      title="لوحة المسؤول"
      badge="ADMIN"
    />
  );
}
