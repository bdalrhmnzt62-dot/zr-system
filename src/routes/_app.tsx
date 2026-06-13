import { createFileRoute } from "@tanstack/react-router";
import { AppShell, type NavItem } from "@/components/AppShell";
import { validateCachedLicense, clearCachedLicense, cacheLicense } from "@/lib/device-id";
import { checkLicense } from "@/lib/license.functions";
import { toast } from "sonner";
import { LayoutDashboard, Users, Wrench, ClipboardList, FileText, Package, Receipt, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: ClientAppLayout,
});

const items: NavItem[] = [
  { to: "/app/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/app/customers", label: "العملاء", icon: Users },
  { to: "/app/work-orders", label: "أوامر الشغل", icon: Wrench },
  { to: "/app/inspections", label: "الكشف الفني", icon: ClipboardList },
  { to: "/app/invoices", label: "الفواتير", icon: FileText },
  { to: "/app/inventory", label: "المخزن", icon: Package },
  { to: "/app/expenses", label: "المصروفات", icon: Receipt },
  { to: "/app/reports", label: "تحليل الأرباح", icon: TrendingUp },
];

function ClientAppLayout() {
  return (
    <AppShell
      items={items}
      title="ZR System"
      guard={async () => {
        const res = validateCachedLicense();
        if (res.ok) {
          if (navigator.onLine) {
            try {
              const online = await checkLicense();
              if (!online) { clearCachedLicense(); toast.error("الاشتراك غير نشط"); return false; }
              cacheLicense({ key: online.key, client_name: online.client_name, activated_at: online.activated_at!, expires_at: online.expires_at });
            } catch { return true; }
          }
          return true;
        }
        if (res.reason === "expired" && navigator.onLine) {
          try {
            const renewed = await checkLicense();
            if (renewed) {
              cacheLicense({ key: renewed.key, client_name: renewed.client_name, activated_at: renewed.activated_at!, expires_at: renewed.expires_at });
              toast.success("تم تحديث الاشتراك تلقائيًا");
              return true;
            }
          } catch { /* retain local lock */ }
        }
        if (res.reason === "tampered") {
          clearCachedLicense();
          toast.error("تم اكتشاف تلاعب في تاريخ الجهاز — يرجى إعادة التفعيل");
        } else if (res.reason === "expired") {
          clearCachedLicense();
          toast.error("انتهت صلاحية الاشتراك");
        }
        return false;
      }}
      redirectIfGuardFails="/activate"
    />
  );
}
