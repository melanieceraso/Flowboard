import type { PostgrestError } from '@supabase/supabase-js'
import { friendlyError } from './friendlyError'

const err = (code: string, message: string) => ({ code, message, details: '', hint: '', name: 'PostgrestError' }) as PostgrestError

describe('friendlyError (audit: no raw DB errors in the UI)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each([
    ['23505', 'That already exists. Please use a different value.'],
    ['23514', 'One of the fields is too long or not allowed.'],
    ['23503', 'That record no longer exists.'],
    ['PGRST301', 'Your session has expired. Please sign in again.'],
  ])('maps %s to a friendly message', (code, expected) => {
    expect(friendlyError(err(code, 'raw'))).toBe(expected)
  })

  it('detects network failures', () => {
    expect(friendlyError(err('', 'TypeError: Failed to fetch'))).toMatch(/Could not reach the server/)
  })

  it('never leaks constraint or column names', () => {
    const msg = friendlyError(err('23514', 'new row violates check constraint "cards_title_check"'))
    expect(msg).not.toMatch(/cards_title_check|constraint/)
    const generic = friendlyError(err('42P01', 'relation "public.cards" does not exist'))
    expect(generic).toBe('Something went wrong. Please try again.')
  })

  it('logs the raw error for debugging', () => {
    const e = err('23505', 'dup')
    friendlyError(e)
    expect(console.error).toHaveBeenCalledWith('[Flowboard] Supabase error:', e)
  })
})
