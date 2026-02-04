// Supabase Edge Function: Send Email
// This function sends email notifications using Supabase's built-in email service
// or can be configured to use external email services (SendGrid, Resend, etc.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const emailData: EmailRequest = await req.json()

    if (!emailData.to || !emailData.subject || !emailData.html) {
      throw new Error('Missing required email fields: to, subject, html')
    }

    // Option 1: Use Supabase's built-in email (if configured)
    // Note: Supabase doesn't have a direct email API in Edge Functions
    // You'll need to use an external service like Resend, SendGrid, or Postmark

    // Option 2: Use Resend (recommended - free tier available)
    // Uncomment and configure with your Resend API key:
    /*
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FlexiWork <noreply@yourdomain.com>', // TODO: Replace with your domain
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
      }),
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const result = await resendResponse.json()
    console.log('✅ Email sent via Resend:', result)
    */

    // Option 3: Use SendGrid
    // Uncomment and configure with your SendGrid API key:
    /*
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured')
    }

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.to }],
        }],
        from: { email: 'noreply@yourdomain.com', name: 'FlexiWork' }, // TODO: Replace
        subject: emailData.subject,
        content: [
          { type: 'text/html', value: emailData.html },
          { type: 'text/plain', value: emailData.text || emailData.html.replace(/<[^>]*>/g, '') },
        ],
      }),
    })

    if (!sendgridResponse.ok) {
      const error = await sendgridResponse.text()
      throw new Error(`SendGrid API error: ${error}`)
    }

    console.log('✅ Email sent via SendGrid')
    */

    // TEMPORARY: For now, just log the email (email service not configured)
    // In production, uncomment one of the options above and configure the API key
    console.log('[EMAIL] Would send email:', {
      to: emailData.to,
      subject: emailData.subject,
      htmlLength: emailData.html.length,
    })

    // Return success (even though we're not actually sending yet)
    // This allows the notification system to work, and you can add email later
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email queued (email service not configured - check logs)',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    console.error('[EMAIL] Error:', error)
    
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
