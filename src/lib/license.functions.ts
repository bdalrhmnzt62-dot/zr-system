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

    // 1. Look up the key
    const { data: lic, error: licErr } = await (supabaseAdmin as any)
      .from("license_keys")
      .select("*")
      .eq("key", data.key)
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
      if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
        await (supabaseAdmin as any).from("license_keys").update({ status: "expired" }).eq("id", lic.id);
        throw new Error("هذا الكود منتهي الصلاحية");
      }
      return {
        key: lic.key,
        client_name: lic.client_name,
        activated_at: lic.activated_at!,
        expires_at: lic.expires_at,
      };
    }

    // 3. First activation (pending → active)
    const now = new Date();
    const expires = new Date(now.getTime() + lic.duration_days * 24 * 60 * 60 * 1000);

    const { data: updated, error: updErr } = await (supabaseAdmin as any)
      .from("license_keys")
      .update({
        status: "active",
        device_id: data.install_id,
        activated_by: userId,
        activated_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .eq("id", lic.id)
      .eq("status", "pending") // race-safe
      .select()
      .maybeSingle();

    if (updErr || !updated) throw new Error("تعذر تفعيل الكود، قد يكون مستخدماً بالفعل");

    // 4. Link to profile
    await (supabase as any).from("profiles").update({ license_key_id: updated.id }).eq("id", userId);

    return {
      key: updated.key,
      client_name: updated.client_name,
      activated_at: updated.activated_at!,
      expires_at: updated.expires_at,
    };
  });

export const checkLicense = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase as any)
      .from("license_keys")
      .select("key, client_name, status, expires_at, activated_at, device_id")
      .eq("activated_by", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).from("license_keys").update({ status: "expired" }).eq("key", data.key);
      return null;
    }
    return data;
  });
