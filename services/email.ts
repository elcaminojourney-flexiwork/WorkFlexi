import { supabase } from '../supabase';

export type EmailNotificationOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send email notification via Supabase Edge Function
 * Falls back gracefully if email service is not available
 */
export async function sendEmailNotification(
  options: EmailNotificationOptions
): Promise<boolean> {
  try {
    console.log('[EMAIL] sendEmailNotification called:', {
      to: options.to,
      subject: options.subject,
    });

    // Try to call Supabase Edge Function for email sending
    // If the function doesn't exist, this will fail gracefully
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      },
    });

    console.log('[EMAIL] Edge Function response:', {
      data,
      error: error ? {
        message: error.message,
        name: error.name,
        status: (error as any).status,
      } : null,
    });

    if (error) {
      console.error('[EMAIL] ❌ Edge Function error:', {
        message: error.message,
        name: error.name,
        status: (error as any).status,
        details: JSON.stringify(error, null, 2),
      });
      console.warn('[EMAIL] ⚠️ Email sending failed - Edge Function may not be deployed or configured');
      // Don't throw - email is non-critical
      return false;
    }

    if (data?.success === false) {
      console.error('[EMAIL] ❌ Edge Function reported failure:', {
        data,
        error: data.error,
      });
      return false;
    }

    console.log('✅ [EMAIL] Email sent successfully via Edge Function:', {
      to: options.to,
      subject: options.subject,
      edgeFunctionData: data,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] ❌ Exception in sendEmailNotification:', err);
    console.error('[EMAIL] ❌ Exception details:', JSON.stringify(err, null, 2));
    // Email sending is non-critical, don't throw
    return false;
  }
}

/**
 * Format notification as HTML email
 */
export function formatNotificationEmail(
  title: string,
  message: string,
  link?: string
): string {
  const linkHtml = link
    ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #F9FAFB; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #111827; margin-top: 0;">${title}</h1>
        <p style="color: #6B7280; font-size: 16px; margin-bottom: 0;">${message}</p>
        ${linkHtml}
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">
        This is an automated notification from FlexiWork. You can manage your notification preferences in your account settings.
      </p>
    </body>
    </html>
  `;
}
