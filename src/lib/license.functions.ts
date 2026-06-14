import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ActivateSchema = z.object({
  key: z.string().trim().min(4).max(64),
  install_id: z.string().trim().min(8).max(128),
});

export const activateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ActivateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase, userId } = context;

    const { data: lic, error: licErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("activation_code", data.key)
      .maybeSingle();

    if (licErr) throw new Error("فشل التحقق من الكود");
    if (!lic) throw new Error("الكود غير صحيح");
    if (lic.status === "revoked") throw new Error("هذا الكود تم إيقافه");
    if (lic.status === "expired") throw new Error("هذا الكود منتهي الصلاحية");

    // 2. If already active, ensure same install + same user
    if (lic.status === "active") {
      if (lic.device_id && lic.device_id !== data.install_id) {
        throw new Error("هذا الكود مفعّل على جهة تثبيت أخرى ولا يمكن استخدامه هنا");
      }
      if (lic.activated_by && lic.activated_by !== userId) {
        throw new Error("هذا الكود مرتبط بمستخدم آخر");
      }
      if (lic.end_date && new Date(lic.end_date) < new Date()) {
        await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", lic.id);
        throw new Error("هذا الكود منتهي الصلاحية");
      }
      return {
        key: lic.activation_code,
        client_name: lic.client_name,
        activated_at: lic.start_date!,
        expires_at: lic.end_date,
      };
    }

    // 3. First activation (pending → active)
    const now = new Date();
    const expires = new Date(now.getTime() + lic.duration_days * 24 * 60 * 60 * 1000);

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        device_id: data.install_id,
        user_id: userId,
        start_date: now.toISOString(),
        end_date: expires.toISOString(),
      })
      .eq("id", lic.id)
      .eq("status", "pending") // race-safe
      .select()
      .maybeSingle();

    if (updErr || !updated) throw new Error("تعذر تفعيل الكود، قد يكون مستخدماً بالفعل");

    // 4. Link to profile
    await supabase.from("profiles").update({ subscription_id: updated.id }).eq("id", userId);

    return {
      key: updated.activation_code,
      client_name: updated.client_name,
      activated_at: updated.start_date!,
      expires_at: updated.end_date,
    };
  });

export const checkSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("activation_code, client_name, status, end_date, start_date, device_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    if (data.end_date && new Date(data.end_date) < new Date()) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("activation_code", data.activation_code);
      return null;
    }
    return {
      key: data.activation_code,
      client_name: data.client_name,
      status: data.status,
      expires_at: data.end_date,
      activated_at: data.start_date,
      device_id: data.device_id,
    };
  });

export const checkLicense = checkSubscription;
