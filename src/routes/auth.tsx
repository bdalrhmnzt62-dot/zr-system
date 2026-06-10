import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | ZR System" },
      { name: "description", content: "تسجيل الدخول أو إنشاء حساب جديد في نظام ZR لإدارة ورش السيارات." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app/dashboard" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) return toast.error("فشل تسجيل الدخول: " + error.message);
    toast.success("مرحباً بعودتك");
    navigate({ to: "/app/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: window.location.origin + "/activate",
        data: { full_name: String(f.get("full_name") ?? "") },
      },
    });
    setLoading(false);
    if (error) return toast.error("فشل إنشاء الحساب: " + error.message);
    toast.success("تم إنشاء الحساب بنجاح");
    navigate({ to: "/activate" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(1_0_0/0.10),transparent_50%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link to="/"><Logo /></Link>
          </div>
          <Card className="border-white/10 bg-card/95 shadow-elegant backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-extrabold">مرحباً بك</CardTitle>
              <CardDescription>سجّل الدخول أو أنشئ حساباً جديداً</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">دخول</TabsTrigger>
                  <TabsTrigger value="signup">حساب جديد</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="si-email">البريد الإلكتروني</Label>
                      <Input id="si-email" name="email" type="email" required dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="si-pw">كلمة المرور</Label>
                      <Input id="si-pw" name="password" type="password" required minLength={6} />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
                      {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                      تسجيل الدخول
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="su-name">الاسم</Label>
                      <Input id="su-name" name="full_name" type="text" required maxLength={120} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">البريد الإلكتروني</Label>
                      <Input id="su-email" name="email" type="email" required dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-pw">كلمة المرور</Label>
                      <Input id="su-pw" name="password" type="password" required minLength={6} />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
                      {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                      إنشاء الحساب
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                <Link to="/" className="hover:text-foreground">العودة للرئيسية</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
