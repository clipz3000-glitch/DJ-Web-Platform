# Supabase setup

The database schema and access rules are in
`supabase/migrations/20261024000100_initial_schema.sql`.

1. Create or select a Supabase project.
2. Add the project's URL as the Replit secret `SUPABASE_URL`.
3. Add the project's anon/publishable key as the Replit secret
   `SUPABASE_ANON_KEY`.
4. Run the migration in the Supabase SQL editor.
5. Enable the email sign-in method in Supabase Auth.
6. When assigning an administrator, set the user's `app_metadata.role` to
   `admin` from a trusted Supabase server/admin workflow. Never let the browser
   set this claim.

The browser uses only the anon/publishable key. Do not add the Supabase
service-role key to the app or expose it to browser code. Row Level Security is
enabled on marketplace tables, and booking requests have database-side pricing,
availability, and overlap checks.

Stripe is not connected. Booking requests can be created and DJs can accept or
decline them, but checkout, payment confirmation, refunds, and payouts must not
be enabled until Stripe Connect and verified webhooks are configured.
