import { createClient } from '@supabase/supabase-js'

// Fill these in your .env file (see .env.example) once your Supabase
// project is ready. Nothing in the current UI calls this yet —
// it's wired up so pages can start reading/writing real data later.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running in UI-only mode.'
  )
}
