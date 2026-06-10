import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Car, ShieldCheck, BarChart3, Wrench, Package, FileText, WifiOff, KeyRound } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZR System | نظام إدارة ورش السيارات الاحترافي" },
      { name: "description", content: "نظام متكامل لإدارة ورش السيارات: عملاء، فواتير، أوامر شغل، كشف فني، مخزن وتحليل أرباح. يعمل أونلاين وأوفلاين بعد التفعيل." },
      { property: "og:title", content: "ZR System | نظام إدارة ورش السيارات" },
      { property: "og:description", content: "إدارة احترافية كاملة لورش السيارات." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl border bg-card p-6 shadow-card transition hover:shadow-elegant hover:-translate-y-1">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-1.5 text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost"><Link to="/activate">تفعيل النظام</Link></Button>
            <Button asChild variant="ghost"><Link to="/auth">تسجيل الدخول</Link></Button>
            <Button asChild className="gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/auth">ابدأ الآن</Link>
            </Button>
          </nav>
          <div className="md:hidden">
            <Button asChild size="sm" className="gradient-primary text-primary-foreground">
              <Link to="/auth">دخول</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.97]" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.12),transparent_55%)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            نظام احترافي جاهز للاستخدام التجاري
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
            إدارة ورشتك بكل احتراف
            <span className="block bg-gradient-to-l from-white to-white/70 bg-clip-text text-transparent">
              في مكان واحد
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
            ZR System هو نظام SaaS عربي متكامل لإدارة ورش السيارات: العملاء، الفواتير، أوامر الشغل،
            الكشف الفني، المخزن، وتحليل الأرباح — مع نظام تفعيل آمن وإمكانية العمل بدون إنترنت.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elegant">
              <Link to="/auth">إنشاء حساب جديد</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
              <Link to="/activate"><KeyRound className="ms-2 h-4 w-4" /> تفعيل بكود</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">كل ما تحتاجه ورشتك</h2>
          <p className="mt-3 text-muted-foreground">أدوات احترافية مصممة خصيصاً لورش السيارات في السوق العربي</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Car} title="إدارة العملاء" desc="سجل كامل بالعملاء وسياراتهم وأرقام اللوحات وتاريخ الزيارات." />
          <Feature icon={Wrench} title="أوامر الشغل" desc="إنشاء ومتابعة أوامر الشغل من الفتح حتى التسليم." />
          <Feature icon={ShieldCheck} title="الكشف الفني" desc="كشف شامل: كهرباء، ميكانيكا، عفشة، سمكرة — مع حالة وملاحظات لكل عنصر." />
          <Feature icon={FileText} title="الفواتير" desc="إنشاء فواتير احترافية مع الطباعة وحفظ PDF." />
          <Feature icon={Package} title="المخزن" desc="إدارة قطع الغيار والكميات والأسعار في مكان واحد." />
          <Feature icon={BarChart3} title="تحليل الأرباح" desc="الإيرادات والمصروفات وصافي الربح في لوحة واضحة." />
          <Feature icon={KeyRound} title="نظام التفعيل" desc="أكواد اشتراك آمنة مربوطة بجهة التثبيت لمنع النسخ." />
          <Feature icon={WifiOff} title="يعمل بدون إنترنت" desc="بعد التفعيل يعمل النظام بشكل كامل أوفلاين." />
          <Feature icon={ShieldCheck} title="حماية كاملة" desc="بيانات كل ورشة معزولة بالكامل ومحمية بسياسات صارمة." />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">جاهز للبدء؟</h2>
          <p className="max-w-xl text-muted-foreground">أنشئ حسابك الآن وفعّل النظام بكود الاشتراك خلال دقيقة.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/auth">إنشاء حساب</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/activate">لدي كود تفعيل</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} ZR System — جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
