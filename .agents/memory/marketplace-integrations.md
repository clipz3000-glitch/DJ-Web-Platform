---
name: Marketplace integration choices
description: The user's current choices for Supabase and payment-provider setup.
---

- Supabase is the selected backend and must not be silently replaced with another database or authentication provider.
- Supabase credentials were not supplied through the secure secrets flow, so use the secrets workflow when setup resumes; never place the service-role key in browser code.
- Stripe integration was deferred. Until Stripe Connect is authorized and configured, checkout, payment confirmation, refunds, commission collection, and payouts must remain disabled and must not be simulated.

**Why:** the user chose to keep Supabase, dismissed the Stripe integration card, and cancelled the Supabase credentials request without providing the secrets.

**How to apply:** preserve these constraints in future marketplace work; make live flows conditional on real credentials and verified server-side payment events.
