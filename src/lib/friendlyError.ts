import type { PostgrestError } from '@supabase/supabase-js'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Converts a raw Supabase/PostgREST error into a short, user-facing message.
 * Logs the original error for debugging, since the full detail (which can
 * include column/constraint names) should never reach the UI.
 */
export function friendlyError(error: PostgrestError): string {
  console.error('[Flowboard] Supabase error:', error)

  switch (error.code) {
    case '23505': // unique_violation
      return 'That already exists. Please use a different value.'
    case '23514': // check_violation
      return 'One of the fields is too long or not allowed.'
    case '23503': // foreign_key_violation
      return 'That record no longer exists.'
    case 'PGRST301': // JWT expired / invalid
      return 'Your session has expired. Please sign in again.'
    default:
      return error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')
        ? 'Could not reach the server. Check your connection and try again.'
        : GENERIC_MESSAGE
  }
}
