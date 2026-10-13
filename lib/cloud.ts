"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { planSchema, type Plan } from "./model";
let instance: SupabaseClient | null = null;
export function cloudClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  instance ??= createClient(url, key);
  return instance;
}
export async function saveCloud(plan: Plan) {
  const client = cloudClient(); if (!client) throw new Error("Online bewaren is nog niet aangesloten.");
  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user) throw new Error("Log eerst in via de e-maillink.");
  const payload = planSchema.parse(plan);
  const { error } = await client.from("woonplannen").upsert({ user_id: data.user.id, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error("Bewaren is niet gelukt. Uw dossier is nog op dit scherm beschikbaar.");
}
export async function loadCloud(): Promise<Plan | null> {
  const client = cloudClient(); if (!client) return null;
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Log eerst in via de e-maillink.");
  const { data, error } = await client.from("woonplannen").select("payload").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error("Het online dossier kan niet worden opgehaald.");
  return data ? planSchema.parse(data.payload) : null;
}
