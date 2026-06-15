import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { promoteSelfAdmin } from "@/lib/admin.functions";
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
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const secretInput = String(f.get("secret") || "");
    
    // هذا هو الرمز السري الخاص بك
    const MY_SECRET = "Jeo123456789#$";

    setLoading(true);
    
    // التحقق المباشر
    if (secretInput === MY_SECRET) {
      try {
        await promote({ data: { secret: secretInput } });
        toast.success("تم تفعيل صلاحيات المسؤول بنجاح!");
        navigate({ to: "/admin/dashboard" });
      } catch (err: any) {
        toast.error("حدث خطأ في الاتصال بقاعدة البيانات");
      }
    } else {
      toast.error("الرمز السري غير صحيح، حاول مجدداً");
    }
    
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle>إعداد المسؤول</CardTitle>
          <CardDescription>أدخل رمز المسؤول الخاص بك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Label htmlFor="secret">الرمز السري</Label>
            <Input id="secret" name="secret" type="password" required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
