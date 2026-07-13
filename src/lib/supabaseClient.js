import { createClient } from "@supabase/supabase-js";

// Estos datos vienen de: Project Settings -> API, en tu proyecto Supabase
// "sercomosa-control-horas". La "anon key" es segura de tener aquí, en el
// código del frontend -- está diseñada para eso, siempre que Row Level
// Security esté activado (ya lo está) y las políticas correctas existan.
const SUPABASE_URL = "https://hbmvxmpecspaosxzpgqs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibXZ4bXBlY3NwYW9zeHpwZ3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzM0MDUsImV4cCI6MjA5OTUwOTQwNX0.SaAQPDW4SX8yPNVPyyKuUDe-3KXwNUrhFeYf_FFQBxQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
