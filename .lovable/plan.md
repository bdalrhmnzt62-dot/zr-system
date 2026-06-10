# ZR System - نظام إدارة ورش السيارات

نظام SaaS احترافي بالعربية (RTL) مع Admin Panel + Client App + نظام تفعيل + Offline (PWA).

## نظرة عامة على المعمارية

```
┌─────────────────────────────────────────┐
│         ZR System (TanStack Start)      │
├─────────────────────────────────────────┤
│  Public:    /          → صفحة هبوط      │
│             /activate  → تفعيل الكود    │
│             /auth      → دخول Admin     │
├─────────────────────────────────────────┤
│  Admin:     /admin/dashboard            │
│             /admin/licenses             │
│             /admin/customers            │
├─────────────────────────────────────────┤
│  Client:    /app/dashboard              │
│             /app/customers              │
│             /app/work-orders            │
│             /app/inspections            │
│             /app/invoices               │
│             /app/inventory              │
│             /app/expenses               │
│             /app/reports                │
└─────────────────────────────────────────┘
        ↓                ↓
   Lovable Cloud    PWA (Offline)
   (Supabase)       IndexedDB cache
```

## المراحل (Phases)

### Phase 1 — التأسيس والتصميم
- تفعيل Lovable Cloud (Supabase) للـ Auth والـ Database
- إعداد RTL كامل + خط عربي احترافي (Cairo / Tajawal)
- نظام ألوان (أزرق رئيسي #1E40AF، أخضر نجاح، أحمر خطأ) في `src/styles.css` بـ oklch
- صفحة هبوط بسيطة للمنتج + صفحة /activate

### Phase 2 — قاعدة البيانات والـ Schema
جداول في Supabase مع RLS:
- `profiles` (مرتبط بـ auth.users) + جدول `user_roles` منفصل (admin / client)
- `license_keys` (key, client_name, device_id, status, duration_days, activated_at, expires_at)
- `customers`, `work_orders`, `inspections`, `inspection_items`
- `invoices`, `invoice_items`
- `inventory_items`, `expenses`
- function `has_role()` security definer لتجنب recursion

### Phase 3 — نظام التفعيل (License)
- صفحة /activate: إدخال الكود → server function يتحقق + يربط device_id (fingerprint)
- حفظ التفعيل في IndexedDB + ربط بالـ session
- منع استخدام الكود على جهاز آخر
- إيقاف تلقائي عند انتهاء expires_at
- Middleware يحرس `/app/*` ويتحقق من صلاحية الكود

### Phase 4 — Admin Panel
- /auth: تسجيل دخول Admin (email + password عبر Supabase Auth)
- /admin/dashboard: إحصائيات (عدد العملاء، الأكواد النشطة، الإيرادات)
- /admin/licenses: قائمة الأكواد + إنشاء/تعديل/حظر + تحديد المدة (افتراضي 30)
- /admin/customers: العملاء المرتبطين بالأكواد

### Phase 5 — Client App (الورشة)
- /app/dashboard: نظرة عامة + Charts (Recharts) للأرباح
- /app/customers: CRUD للعملاء
- /app/work-orders: أوامر الشغل
- /app/inspections: نظام كشف فني (كهرباء/ميكانيكا/عفشة/سمكرة)، كل عنصر له حالة (سليم/متابعة/إصلاح) + ملاحظات
- /app/invoices: فواتير CRUD + طباعة احترافية (react-to-print) بتصميم PDF-friendly
- /app/inventory: مخزن قطع الغيار
- /app/expenses: المصروفات
- /app/reports: تحليل الأرباح (إيرادات - مصروفات = صافي ربح) + تقارير شهرية

### Phase 6 — PWA و Offline
- manifest.webmanifest + service worker (vite-plugin-pwa) مع NetworkFirst للـ HTML و CacheFirst للأصول
- بعد التفعيل: التطبيق يعمل offline
- مزامنة عند رجوع الإنترنت

## القرارات التقنية

| المجال | الاختيار |
|---|---|
| Framework | TanStack Start (موجود) |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (Email/Password للـ Admin) |
| Database | Postgres + RLS + user_roles منفصل |
| Charts | Recharts |
| Print | react-to-print |
| PWA | vite-plugin-pwa |
| Date format | YYYY-MM-DD (إنجليزي فقط) |
| Language | عربي 100% + RTL |

## ملاحظات أمنية مهمة
- الـ Device fingerprint يُحسب client-side ويُرسل للسيرفر، السيرفر يخزنه ويرفض أي device_id مختلف
- جدول `user_roles` منفصل مع `has_role()` security definer (منع privilege escalation)
- كل الجداول لها RLS policies صارمة
- Service role key لا يُستخدم إلا في server functions موثوقة

## ما الذي سيتم في أول دفعة بناء (هذه الجلسة)
بسبب حجم المشروع الضخم، سأبني في هذه الجلسة:
1. **Phase 1 كامل**: تفعيل Cloud + Design system + RTL + صفحة هبوط + هيكل routes
2. **Phase 2 كامل**: كل الجداول + RLS + roles
3. **Phase 3 كامل**: نظام التفعيل (الجزء الأهم)
4. **Phase 4 كامل**: Admin Panel كامل
5. **Phase 5 جزئياً**: Dashboard + Customers + Work Orders + Inspections + Invoices (الأساسيات)

وفي الجلسة التالية نكمل: Inventory + Expenses + Reports المفصلة + PWA Offline.

هل تريد المتابعة بهذه الخطة، أم تريد تعديلات (مثلاً: البدء بـ Admin فقط أولاً، أو الـ Client App أولاً، أو تغيير الألوان)؟
