// Supabase Edge Function: Notification Reminders
// This function runs all reminder notification checks
// Should be called every 15 minutes via cron trigger

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[NOTIFICATION-REMINDERS] Starting reminder checks...')

    // Call the master function that runs all reminder checks
    const { data, error } = await supabaseClient.rpc('run_all_notification_reminders')

    if (error) {
      console.error('[NOTIFICATION-REMINDERS] Error:', error)
      throw error
    }

    const result = data && data.length > 0 ? data[0] : {
      shift_reminders: 0,
      clock_in_reminders: 0,
      clock_out_reminders: 0,
      timesheet_reminders: 0
    }

    console.log('[NOTIFICATION-REMINDERS] Completed:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        reminders_sent: {
          shift_reminders: result.shift_reminders || 0,
          clock_in_reminders: result.clock_in_reminders || 0,
          clock_out_reminders: result.clock_out_reminders || 0,
          timesheet_reminders: result.timesheet_reminders || 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    console.error('[NOTIFICATION-REMINDERS] Exception:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    )
  }
})
