/*
# Harden function access

Plain-English summary: the booking actions are only meant for signed-in users, and the
trigger-only functions are never meant to be called directly. This migration removes the
default public execute permission from them and pins the search path of the admin check.

1. Changed functions
- respond_to_booking, cancel_booking, complete_booking, prepare_booking_request:
  execute granted to signed-in users only (anonymous visitors removed).
- create_profile_for_new_user, create_conversation_for_booking, notify_conversation_message:
  trigger-only; execute removed from all client roles. Triggers still run normally.
- is_admin: fixed search path so it cannot be redirected by a caller.
- btree_gist extension moved out of the public schema into "extensions".

2. Notes
- Only grants and function settings change. No table data is touched.
- All statements are safe to re-run.
*/

REVOKE EXECUTE ON FUNCTION public.respond_to_booking(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_booking(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_booking(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.prepare_booking_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_booking_request() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_profile_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_conversation_for_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_conversation_message() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'btree_gist' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END $$;
