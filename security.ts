import { z } from 'zod';
import { supabase } from './supabase';

// Input validation schemas
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  fullName: z.string().min(2),
});

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank']),
  last4: z.string().length(4),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2024).optional(),
  bankName: z.string().optional(),
});

// Rate limiting
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) throw error;
  return data;
}

// Audit logging
export async function logAuditEvent(
  userId: string,
  action: string,
  details: Record<string, any>
) {
  const { error } = await supabase
    .from('audit_logs')
    .insert([{
      user_id: userId,
      action,
      ...details,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
    }]);

  if (error) throw error;
}

// Analytics tracking
export async function trackEvent(
  userId: string,
  eventType: string,
  eventData: Record<string, any>
) {
  const { error } = await supabase.rpc('record_analytics_event', {
    p_user_id: userId,
    p_event_type: eventType,
    p_event_data: eventData,
    p_page_url: window.location.href,
    p_user_agent: navigator.userAgent,
    p_ip_address: await getClientIP(),
  });

  if (error) throw error;
}

// Helper function to get client IP (placeholder)
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return '0.0.0.0';
  }
}