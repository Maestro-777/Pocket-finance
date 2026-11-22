import { createClient } from '@supabase/supabase-js'

// These are public browser credentials. Row Level Security protects every row;
// never put a Supabase secret/service-role key in this file.
export const supabase = createClient(
  'https://zmaqsrhbhprdrfmsfbzb.supabase.co',
  'sb_publishable_NdmJOoLOWlCxdaSBjw9CLA_bUoXlXmz',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
