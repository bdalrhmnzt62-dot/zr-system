import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Users, CheckCircle2, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  component: AdminDashboard,
});

function Stat({ label, value, icon: Icon, hue }: { label: string; value: string | number; icon: any; hue: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${hue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-extrabold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const stats = useServerFn(adminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => stats() });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">نظرة عامة</h2>
        <p className="text-sm text-muted-foreground">إحصائيات نظام ZR System</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="إجمالي الأكواد" value={isLoading ? "..." : data?.totalLicenses ?? 0} icon={KeyRound} hue="bg-accent text-accent-foreground" />
        <Stat label="الأكواد النشطة" value={isLoading ? "..." : data?.byStatus?.active ?? 0} icon={CheckCircle2} hue="bg-success/15 text-success" />
        <Stat label="إجمالي العملاء" value={isLoading ? "..." : data?.totalCustomers ?? 0} icon={Users} hue="bg-primary/10 text-primary" />
        <Stat label="إجمالي الإيرادات" value={isLoading ? "..." : `${Number(data?.totalRevenue ?? 0).toLocaleString("en-US")} ج.م`} icon={DollarSign} hue="bg-warning/15 text-warning-foreground" />
      </div>

      <Card>
        <CardHeader><CardTitle>توزيع حالة الأكواد</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">قيد الانتظار</p><p className="text-xl font-bold">{data?.byStatus?.pending ?? 0}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">نشط</p><p className="text-xl font-bold text-success">{data?.byStatus?.active ?? 0}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">منتهي</p><p className="text-xl font-bold text-muted-foreground">{data?.byStatus?.expired ?? 0}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">محظور</p><p className="text-xl font-bold text-destructive">{data?.byStatus?.revoked ?? 0}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
