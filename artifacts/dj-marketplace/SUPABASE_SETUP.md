# Supabase setup

The database schema and access rules are in
`supabase/migrations/20261024000100_initial_schema.sql`.

1. Create or select a Supabase project.
2. Set the environment variable `SUPABASE_URL` (or `VITE_SUPABASE_URL`) to the
   project URL.
3. Set `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`) to the project's
   anon/publishable key.
4. Run the migration in the Supabase SQL editor (or apply it through your
   migration tooling).
5. Enable the email sign-in method in Supabase Auth.
6. Email verification (Authentication > Sign In / Providers > Email):
   - Turn on "Confirm email" so new accounts must verify before signing in.
   - Authentication > URL Configuration: set the Site URL to the live app URL,
     and add every origin the app runs on (the live domain and any preview
     domain) to the Redirect URLs list. Verification links that point to an
     origin not on this list will not work.
   - Authentication > Emails: the built-in mailer is limited and may be slow or
     land in spam. For reliable delivery, configure a custom SMTP provider under
     Project Settings > Auth > SMTP Settings.
   - Users can request a new confirmation email from the sign-up and sign-in
     screens.
7. When assigning an administrator, set the user's `app_metadata.role` to
   `admin` from a trusted Supabase server/admin workflow. Never let the browser
   set this claim.

The browser uses only the anon/publishable key. Do not add the Supabase
service-role key to the app or expose it to browser code. Row Level Security is
enabled on marketplace tables, and booking requests have database-side pricing,
availability, and overlap checks.

Stripe is not connected. Booking requests can be created and DJs can accept or
decline them, but checkout, payment confirmation, refunds, and payouts must not
be enabled until Stripe Connect and verified webhooks are configured.
