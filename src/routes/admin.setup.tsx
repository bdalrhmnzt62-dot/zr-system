import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { promoteSelfAdmin, getMyRole } from "@/lib/admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/setup")({
  head: () => ({ meta: [{ title: "إعداد المسؤول | ZR System" }] }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const promote = useServerFn(promoteSelfAdmin);
  const getRole = useServerFn(getMyRole);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      try {
        const r = await getRole();
        if (r.roles.includes("admin")) navigate({ to: "/admin/dashboard" });
      } catch { /* noop */ }
    })();
  }, [navigate, getRole]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await promote({ data: { secret: String(f.get("secret") || "") } });
      toast.success("تم منحك صلاحيات المسؤول");
      navigate({ to: "/admin/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "فشلت العملية");
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center"><Link to="/"><Logo /></Link></div>
          <Card className="bg-card/95 shadow-elegant backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl gradient-primary shadow-elegant">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>إعداد المسؤول الأول</CardTitle>
              <CardDescription>أدخل الرمز السري للحصول على صلاحيات المسؤول</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="secret">الرمز السري</Label>
                  <Input id="secret" name="secret" type="password" required placeholder="ZR-BOOTSTRAP-2026" />
                  <p className="text-xs text-muted-foreground">القيمة الافتراضية: <code className="font-mono">ZR-BOOTSTRAP-2026</code> — غيّرها من إعدادات النظام بعد الإعداد.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
                  {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                  منحي صلاحيات المسؤول
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
