import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (typeof window === 'undefined' || !supabaseUrl || !supabaseAnonKey) {
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get() {
        throw new Error('Supabase browser client is unavailable until runtime environment variables are configured')
      },
    })
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}