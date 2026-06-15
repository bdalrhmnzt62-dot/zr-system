import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/setup")({
  component: BypassSetup,
});

function BypassSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    // الحركة دي بتجبر الموقع إنه يفتح الـ Dashboard فوراً 
    // لأنك بالفعل عدلت الـ role بتاعك لـ admin في قاعدة البيانات
    toast.success("جارٍ الدخول التلقائي...");
    navigate({ to: "/admin/dashboard" });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>جارٍ تحويلك إلى لوحة التحكم...</p>
    </div>
  );
}
