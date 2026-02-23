import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not set')
console.log('Supabase Service Key:', supabaseServiceKey ? 'Set' : 'Not set')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (() => {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set. Using regular client for admin operations.')
      return supabase
    })()

export function ensureSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'in Vercel project settings or .env.local for local development.'
    )
  }
}
