import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAdminSettings, saveAdminSettings, getAdminSetupCode, updateAdminSetupCode } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Loader2, Save, Settings, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getAdminSettings);
  const save = useServerFn(saveAdminSettings);
  const loadSetupCode = useServerFn(getAdminSetupCode);
  const saveSetupCode = useServerFn(updateAdminSetupCode);
  const [autoSync, setAutoSync] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);

  const { data: adminSetupCodeData, isLoading: isLoadingSetupCode } = useQuery({
    queryKey: ["admin-setup-code"],
    queryFn: () => loadSetupCode(),
  });

  const setupCodeMutation = useMutation({
    mutationFn: (code: string) => saveSetupCode({ data: { code } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-setup-code"] });
      toast.success("تم تحديث رمز تفعيل الأدمن بنجاح");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const value = await load();
      setAutoSync(value.auto_sync);
      setInventoryAlerts(value.inventory_alerts);
      return value;
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return { ...data, email: user.email ?? "" };
    },
  });

  const systemMutation = useMutation({
    mutationFn: (data: {
      system_name: string;
      currency: string;
      auto_sync: boolean;
      inventory_alerts: boolean;
    }) => save({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("تم حفظ إعدادات النظام");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const profileMutation = useMutation({
    mutationFn: async (data: { full_name: string; workshop_name: string; phone: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("profiles").update(data).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      toast.success("تم تحديث الحساب");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      if (password.length < 8) throw new Error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => toast.success("تم تغيير كلمة المرور بأمان"),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">الإعدادات</h2>
        <p className="text-sm text-muted-foreground">إدارة الحساب والنظام وصلاحيات المسؤول</p>
      </div>
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="system">
            <Settings className="ms-2 h-4 w-4" />
            النظام
          </TabsTrigger>
          <TabsTrigger value="account">
            <UserRound className="ms-2 h-4 w-4" />
            الحساب
          </TabsTrigger>
          <TabsTrigger value="password">
            <KeyRound className="ms-2 h-4 w-4" />
            كلمة المرور
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <ShieldCheck className="ms-2 h-4 w-4" />
            الصلاحيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام</CardTitle>
              <CardDescription>التفضيلات العامة لنظام الإدارة</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  systemMutation.mutate({
                    system_name: String(form.get("system_name")),
                    currency: String(form.get("currency")),
                    auto_sync: autoSync,
                    inventory_alerts: inventoryAlerts,
                  });
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="system_name">اسم النظام</Label>
                    <Input
                      id="system_name"
                      name="system_name"
                      defaultValue={settings?.system_name}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة</Label>
                    <Input
                      id="currency"
                      name="currency"
                      defaultValue={settings?.currency}
                      required
                      maxLength={12}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-semibold">المزامنة التلقائية</p>
                    <p className="text-xs text-muted-foreground">
                      رفع التغييرات المحلية تلقائيًا عند عودة الإنترنت
                    </p>
                  </div>
                  <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-semibold">تنبيهات المخزون</p>
                    <p className="text-xs text-muted-foreground">
                      إظهار الأصناف التي وصلت للحد الأدنى
                    </p>
                  </div>
                  <Switch checked={inventoryAlerts} onCheckedChange={setInventoryAlerts} />
                </div>
                <Button type="submit" disabled={systemMutation.isPending}>
                  <Save className="ms-2 h-4 w-4" />
                  حفظ
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الحساب</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  profileMutation.mutate({
                    full_name: String(form.get("full_name")),
                    workshop_name: String(form.get("workshop_name")),
                    phone: String(form.get("phone")),
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile?.full_name ?? ""}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workshop_name">اسم الورشة</Label>
                  <Input
                    id="workshop_name"
                    name="workshop_name"
                    defaultValue={profile?.workshop_name ?? ""}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={profile?.phone ?? ""}
                    dir="ltr"
                    maxLength={20}
                  />
                </div>
                <Button type="submit" disabled={profileMutation.isPending}>
                  <Save className="ms-2 h-4 w-4" />
                  حفظ الحساب
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة مرور الأدمن</CardTitle>
              <CardDescription>يتم تحديث كلمة المرور عبر خدمة المصادقة الآمنة</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="max-w-md space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const password = String(form.get("password"));
                  if (password !== String(form.get("confirm")))
                    return toast.error("كلمتا المرور غير متطابقتين");
                  passwordMutation.mutate(password);
                  event.currentTarget.reset();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                  <Input id="confirm" name="confirm" type="password" minLength={8} required />
                </div>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  <KeyRound className="ms-2 h-4 w-4" />
                  تغيير كلمة المرور
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>رمز تفعيل صفحة الأدمن</CardTitle>
              <CardDescription>
                هذا هو الكود السري الذي يتم استخدامه في صفحة /admin/setup لترقية أي مستخدم إلى رتبة مسؤول (الأدمن). يمكنك تعديله هنا في أي وقت لحماية النظام.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSetupCode ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <form
                  className="max-w-md space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const code = String(form.get("setup_code")).trim();
                    if (code.length < 4) {
                      return toast.error("يجب ألا يقل الرمز عن 4 أحرف");
                    }
                    setupCodeMutation.mutate(code);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="setup_code">رمز تفعيل الأدمن الحالي</Label>
                    <Input
                      id="setup_code"
                      name="setup_code"
                      type="text"
                      defaultValue={adminSetupCodeData?.code}
                      placeholder="أدخل رمز تفعيل جديد"
                      required
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>
                  <Button type="submit" disabled={setupCodeMutation.isPending}>
                    <Save className="ms-2 h-4 w-4" />
                    حفظ رمز التفعيل
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>صلاحيات المسؤول</CardTitle>
              <CardDescription>
                هذه الصفحة محمية على مستوى الخادم ولا تظهر لغير الأدمن
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge>ADMIN</Badge>
              <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                <li>إدارة أكواد التفعيل والتجديد والحظر</li>
                <li>عرض حسابات العملاء والإحصائيات</li>
                <li>تعديل إعدادات النظام والحساب</li>
                <li>لا يمكن للمستخدم العادي الوصول إلى هذه الوظائف</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
                       }
