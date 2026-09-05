import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fntslcpolwzjgynhelnl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudHNsY3BvbHd6amd5bmhlbG4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4Nzk3ODMzMSwiZXhwIjoyMTAzNTQzMzMxfQ.LyGM3u-4QskaQhbIjKq6ueD3eHgSG0lVi4vkX-NKS2Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const APP_URL = window.location.origin
