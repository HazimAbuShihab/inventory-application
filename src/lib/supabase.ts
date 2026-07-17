import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // This module is evaluated before React mounts, so a bare throw would leave a
  // blank page. Paint an actionable message first, then halt.
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif;background:#f6f7f8;padding:24px">
        <div style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,.05)">
          <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">Configuration required</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
            The Supabase connection is not configured. Create a <code>.env.local</code> file
            in the project root (copy <code>.env.example</code>) and set:
          </p>
          <pre style="margin:0 0 16px;background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto">VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co
VITE_SUPABASE_ANON_KEY=&lt;anon key&gt;</pre>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6">
            Find both values in the Supabase Dashboard under
            <strong>Project Settings → API</strong>, then restart the dev server.
          </p>
        </div>
      </div>`
  }
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
