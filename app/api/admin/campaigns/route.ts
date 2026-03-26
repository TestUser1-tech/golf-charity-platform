import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, description, is_active, starts_at, ends_at, country_code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  country_code: z.string().max(8).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      country_code: parsed.data.country_code || null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
      is_active: parsed.data.is_active ?? false,
    })
    .select("id, name, description, is_active, starts_at, ends_at, country_code, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  country_code: z.string().max(8).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const payload = await request.json();
  const parsed = patchSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updateData } = parsed.data;
  const supabase = await createServerSupabaseClient();

  if (parsed.data.is_active) {
    await supabase.from("campaigns").update({ is_active: false }).neq("id", id);
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", id)
    .select("id, name, description, is_active, starts_at, ends_at, country_code, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
