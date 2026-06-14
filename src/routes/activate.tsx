import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { activateLicense, checkSubscription } from "@/lib/license.functions";
import { getInstallId } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "تفعيل النظام | ZR System" },
      { name: "description", content: "تفعيل اشتراك نظام ZR لإدارة ورش السيارات بكود التفعيل." },
    ],
  }),
  component: ActivatePage,
});

function ActivatePage() {
  const navigate = useNavigate();
  const activate = useServerFn(activateLicense);
  const check = useServerFn(checkSubscription);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      try {
        const lic = await check();
        if (lic) {
          navigate({ to: "/app/dashboard" });
          return;
        }
      } catch { /* ignore */ }
      setChecking(false);
    })();
  }, [navigate, check]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const key = String(f.get("key") || "").trim().toUpperCase();
    if (!key) return;
    setLoading(true);
    try {
      const lic = await activate({ data: { key, install_id: getInstallId() } });
      toast.success("تم التفعيل بنجاح");
      navigate({ to: "/app/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "فشل التفعيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link to="/"><Logo /></Link>
          </div>
          <Card className="bg-card/95 shadow-elegant backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl gradient-primary shadow-elegant">
                <KeyRound className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-extrabold">تفعيل النظام</CardTitle>
              <CardDescription>أدخل كود التفعيل الذي حصلت عليه لبدء استخدام النظام</CardDescription>
            </CardHeader>
            <CardContent>
              {checking ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">كود التفعيل</Label>
                    <Input id="key" name="key" required maxLength={64} placeholder="ZR-XXXX-XXXX-XXXX" dir="ltr" className="text-center font-mono tracking-wider" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
                    {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                    تفعيل
                  </Button>
                  <div className="flex items-start gap-2 rounded-lg border bg-accent/30 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>الكود يرتبط بجهة تثبيت واحدة فقط لمنع النسخ، ولا يمكن استخدامه في مكان آخر بعد التفعيل.</p>
                  </div>
                  <Button type="button" variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
                    تسجيل الخروج
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
