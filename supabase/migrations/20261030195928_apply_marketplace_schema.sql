/*
# Apply Encore marketplace schema

1. Summary
- Creates the full marketplace schema (profiles, DJ and host profiles, availability, bookings, conversations, messages, notifications, favorites, reviews, payment and payout records, disputes, reports, uploaded media, platform settings).
- Adds the booking, messaging, review, and role-protection database functions and triggers.
- Creates the public DJ directory view and the public portfolio storage bucket.

2. Security
- Row Level Security is enabled on every marketplace table.
- Policies are scoped to the signed-in owner, participant, or administrator; public reads are limited to verified, active DJs.
- Column-level grants restrict what the browser can read or write; payment records are write-protected from browser roles.

3. Notes
- Safe to re-run: all objects use IF NOT EXISTS, OR REPLACE, or DROP ... IF EXISTS before creation.
- No existing data is modified or removed.
*/

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$ begin
  create type public.marketplace_role as enum ('host', 'dj');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum (
    'pending',
    'accepted',
    'declined',
    'payment_pending',
    'confirmed',
    'completed',
    'cancelled',
    'refunded',
    'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.availability_status as enum ('available', 'blocked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending',
    'succeeded',
    'failed',
    'refunded',
    'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payout_status as enum (
    'not_started',
    'pending',
    'paid',
    'failed',
    'reversed'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.marketplace_role not null,
  display_name text not null default '',
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dj_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  stage_name text not null,
  bio text not null default '',
  genres text[] not null default '{}',
  event_types text[] not null default '{}',
  hourly_rate_minor integer not null check (hourly_rate_minor >= 0),
  currency char(3) not null default 'GBP',
  minimum_booking_hours numeric(4, 2) not null default 1
    check (minimum_booking_hours > 0 and minimum_booking_hours <= 24),
  experience_years integer not null default 0
    check (experience_years >= 0 and experience_years <= 100),
  equipment_notes text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  accepting_bookings boolean not null default false,
  is_active boolean not null default true,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid not null references public.dj_profiles(profile_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.availability_status not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (
    dj_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete restrict,
  dj_id uuid not null references public.dj_profiles(profile_id) on delete restrict,
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null check (length(trim(venue)) between 1 and 160),
  location text not null check (length(trim(location)) between 1 and 160),
  guest_count integer not null check (guest_count between 1 and 100000),
  event_details text not null default '' check (length(event_details) <= 3000),
  music_preferences text not null default '' check (length(music_preferences) <= 1000),
  special_requests text not null default '' check (length(special_requests) <= 2000),
  status public.booking_status not null default 'pending',
  quoted_amount_minor integer not null default 0 check (quoted_amount_minor >= 0),
  currency char(3) not null default 'GBP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (currency ~ '^[A-Z]{3}$'),
  exclude using gist (
    dj_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (
    status in ('pending', 'accepted', 'payment_pending', 'confirmed')
  )
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  host_id uuid not null references public.profiles(id) on delete restrict,
  dj_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (
    notification_type in (
      'booking_request',
      'booking_accepted',
      'booking_declined',
      'booking_cancelled',
      'payment_completed',
      'payment_failed',
      'new_message',
      'upcoming_event',
      'refund',
      'payout_update',
      'new_review'
    )
  ),
  title text not null,
  body text not null default '',
  booking_id uuid references public.bookings(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  host_id uuid not null references public.profiles(id) on delete cascade,
  dj_id uuid not null references public.dj_profiles(profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (host_id, dj_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  dj_id uuid not null references public.dj_profiles(profile_id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  amount_minor integer not null check (amount_minor >= 0),
  platform_fee_minor integer not null check (platform_fee_minor >= 0),
  dj_payout_minor integer not null check (dj_payout_minor >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'pending',
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  refund_status text not null default 'not_requested'
    check (refund_status in ('not_requested', 'pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  dj_id uuid not null references public.dj_profiles(profile_id) on delete restrict,
  amount_minor integer not null check (amount_minor >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  status public.payout_status not null default 'not_started',
  stripe_transfer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'closed')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  reported_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create table if not exists public.uploaded_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  object_path text not null unique,
  media_type text not null check (media_type in ('avatar', 'portfolio')),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  singleton boolean primary key default true check (singleton),
  commission_basis_points integer not null
    check (commission_basis_points between 0 and 10000),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists dj_profiles_discovery_idx
  on public.dj_profiles (is_active, accepting_bookings, hourly_rate_minor);
create index if not exists dj_profiles_genres_idx
  on public.dj_profiles using gin (genres);
create index if not exists dj_profiles_event_types_idx
  on public.dj_profiles using gin (event_types);
create index if not exists availability_dj_time_idx
  on public.availability_blocks (dj_id, starts_at, ends_at);
create index if not exists bookings_host_created_idx
  on public.bookings (host_id, created_at desc);
create index if not exists bookings_dj_created_idx
  on public.bookings (dj_id, created_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists reviews_dj_created_idx
  on public.reviews (dj_id, created_at desc);
create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  if requested_role is null or requested_role not in ('host', 'dj') then
    requested_role := 'host';
  end if;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    requested_role::public.marketplace_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.prepare_booking_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dj_rate integer;
  dj_currency char(3);
  minimum_hours numeric(4, 2);
  requested_hours numeric;
  matching_slot uuid;
begin
  if auth.uid() is null or new.host_id <> auth.uid() then
    raise exception 'Booking requests must be created for the signed-in host';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'host'
  ) then
    raise exception 'Only host accounts can request bookings';
  end if;

  if new.ends_at <= new.starts_at then
    raise exception 'Event end time must be after the start time';
  end if;

  if new.starts_at <= now() then
    raise exception 'Booking requests must be for a future event';
  end if;

  select d.hourly_rate_minor, d.currency, d.minimum_booking_hours
  into dj_rate, dj_currency, minimum_hours
  from public.dj_profiles d
  where d.profile_id = new.dj_id
    and d.is_active
    and d.accepting_bookings;

  if not found then
    raise exception 'This DJ is not accepting booking requests';
  end if;

  select a.id
  into matching_slot
  from public.availability_blocks a
  where a.dj_id = new.dj_id
    and a.status = 'available'
    and a.starts_at <= new.starts_at
    and a.ends_at >= new.ends_at
  for update;

  if matching_slot is null then
    raise exception 'The DJ has not marked this time as available';
  end if;

  requested_hours := extract(epoch from (new.ends_at - new.starts_at)) / 3600.0;
  new.quoted_amount_minor := ceil(greatest(requested_hours, minimum_hours) * dj_rate);
  new.currency := dj_currency;
  new.status := 'pending';
  return new;
end;
$$;

drop trigger if exists prepare_booking_request_before_insert on public.bookings;
create trigger prepare_booking_request_before_insert
  before insert on public.bookings
  for each row execute function public.prepare_booking_request();

create or replace function public.prevent_availability_change_for_booking()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  candidate_dj uuid;
  candidate_start timestamptz;
  candidate_end timestamptz;
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.bookings b
      where b.dj_id = old.dj_id
        and b.status in ('pending', 'accepted', 'payment_pending', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)')
            && tstzrange(old.starts_at, old.ends_at, '[)')
    ) then
      raise exception 'Availability overlapping an active booking cannot be deleted';
    end if;
    return old;
  end if;

  candidate_dj := new.dj_id;
  candidate_start := new.starts_at;
  candidate_end := new.ends_at;

  if exists (
    select 1
    from public.bookings b
    where b.dj_id = old.dj_id
      and b.status in ('pending', 'accepted', 'payment_pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at, '[)')
          && tstzrange(old.starts_at, old.ends_at, '[)')
      and not (
        new.status = 'available'
        and candidate_dj = b.dj_id
        and candidate_start <= b.starts_at
        and candidate_end >= b.ends_at
      )
  ) then
    raise exception 'Availability overlapping an active booking cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_booked_availability on public.availability_blocks;
create trigger protect_booked_availability
  before update or delete on public.availability_blocks
  for each row execute function public.prevent_availability_change_for_booking();

create or replace function public.create_conversation_for_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.conversations (booking_id, host_id, dj_id)
  values (new.id, new.host_id, new.dj_id)
  on conflict (booking_id) do nothing;

  insert into public.notifications (
    recipient_id, notification_type, title, body, booking_id
  )
  values (
    new.dj_id, 'booking_request', 'New booking request',
    'A host has sent you an event request.', new.id
  );

  return new;
end;
$$;

drop trigger if exists create_conversation_after_booking on public.bookings;
create trigger create_conversation_after_booking
  after insert on public.bookings
  for each row execute function public.create_conversation_for_booking();

create or replace function public.respond_to_booking(
  p_booking_id uuid,
  p_accept boolean
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row public.bookings;
  next_status public.booking_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  next_status := case when p_accept then 'accepted'::public.booking_status
                      else 'declined'::public.booking_status end;

  update public.bookings b
  set status = next_status, updated_at = now()
  where b.id = p_booking_id
    and b.dj_id = auth.uid()
    and b.status = 'pending'
  returning b.* into booking_row;

  if not found then
    raise exception 'Booking not found or no longer pending';
  end if;

  insert into public.notifications (
    recipient_id, notification_type, title, body, booking_id
  )
  values (
    booking_row.host_id,
    case when p_accept then 'booking_accepted' else 'booking_declined' end,
    case when p_accept then 'DJ accepted your request' else 'DJ declined your request' end,
    case when p_accept
      then 'Your request is accepted. Payment is not available yet.'
      else 'You can browse other DJs for your event.'
    end,
    booking_row.id
  );

  return booking_row;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.bookings b
  set status = 'cancelled', updated_at = now()
  where b.id = p_booking_id
    and auth.uid() in (b.host_id, b.dj_id)
    and b.status in ('pending', 'accepted', 'payment_pending')
  returning b.* into booking_row;

  if not found then
    raise exception 'Booking cannot be cancelled by this user or in its current state';
  end if;

  insert into public.notifications (
    recipient_id, notification_type, title, body, booking_id
  )
  values (
    case when auth.uid() = booking_row.host_id then booking_row.dj_id else booking_row.host_id end,
    'booking_cancelled',
    'Booking request cancelled',
    'A booking request has been cancelled.',
    booking_row.id
  );

  return booking_row;
end;
$$;

create or replace function public.complete_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.bookings b
  set status = 'completed', updated_at = now()
  where b.id = p_booking_id
    and auth.uid() in (b.host_id, b.dj_id)
    and b.status = 'confirmed'
    and b.ends_at <= now()
  returning b.* into booking_row;

  if not found then
    raise exception 'Only a confirmed, completed event can be marked complete';
  end if;

  return booking_row;
end;
$$;

create or replace function public.notify_conversation_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient uuid;
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  select case when c.host_id = new.sender_id then c.dj_id else c.host_id end
  into recipient
  from public.conversations c
  where c.id = new.conversation_id;

  insert into public.notifications (
    recipient_id, notification_type, title, body
  )
  values (recipient, 'new_message', 'New message', 'You have a new booking message.');

  return new;
end;
$$;

drop trigger if exists notify_after_message on public.messages;
create trigger notify_after_message
  after insert on public.messages
  for each row execute function public.notify_conversation_message();

create or replace function public.validate_review()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.bookings b
    where b.id = new.booking_id
      and b.host_id = auth.uid()
      and b.host_id = new.reviewer_id
      and b.dj_id = new.dj_id
      and b.status = 'completed'
  ) then
    raise exception 'Reviews require a completed booking with this DJ';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_review_before_insert on public.reviews;
create trigger validate_review_before_insert
  before insert on public.reviews
  for each row execute function public.validate_review();

create or replace function public.validate_dispute()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.bookings b
    where b.id = new.booking_id
      and auth.uid() in (b.host_id, b.dj_id)
      and new.opened_by = auth.uid()
  ) then
    raise exception 'Only a booking participant can open a dispute';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_dispute_before_insert on public.disputes;
create trigger validate_dispute_before_insert
  before insert on public.disputes
  for each row execute function public.validate_dispute();

create or replace function public.validate_favorite()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.host_id and p.role = 'host' and p.id = auth.uid()
  ) then
    raise exception 'Only the signed-in host can save a DJ';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_favorite_before_insert on public.favorites;
create trigger validate_favorite_before_insert
  before insert on public.favorites
  for each row execute function public.validate_favorite();

create or replace function public.prevent_payment_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Payment records are managed by trusted payment processing only';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_payment_records on public.payments;
create trigger protect_payment_records
  before insert or update or delete on public.payments
  for each row execute function public.prevent_payment_mutation();

drop trigger if exists protect_payout_records on public.payouts;
create trigger protect_payout_records
  before insert or update or delete on public.payouts
  for each row execute function public.prevent_payment_mutation();

create or replace function public.validate_platform_settings()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator may change platform settings';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_platform_settings_before_write on public.platform_settings;
create trigger validate_platform_settings_before_write
  before insert or update on public.platform_settings
  for each row execute function public.validate_platform_settings();

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.role <> old.role and not public.is_admin() then
    raise exception 'Marketplace account role cannot be changed by the account owner';
  end if;
  if tg_op = 'INSERT' and new.role is null then
    raise exception 'A marketplace role is required';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before insert or update of role on public.profiles
  for each row execute function public.prevent_role_escalation();

create or replace function public.prevent_dj_verification_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.verification_status <> old.verification_status
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only an administrator can change DJ verification status';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_dj_verification_escalation on public.dj_profiles;
create trigger prevent_dj_verification_escalation
  before update of verification_status on public.dj_profiles
  for each row execute function public.prevent_dj_verification_change();

create or replace function public.prevent_deleting_active_booking()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Booking history cannot be deleted';
end;
$$;

drop trigger if exists prevent_booking_delete on public.bookings;
create trigger prevent_booking_delete
  before delete on public.bookings
  for each row execute function public.prevent_deleting_active_booking();

create or replace view public.public_dj_profiles
with (security_invoker = true)
as
select
  p.id as profile_id,
  p.display_name,
  p.avatar_url,
  p.city,
  d.stage_name,
  d.bio,
  d.genres,
  d.event_types,
  d.hourly_rate_minor,
  d.currency,
  d.minimum_booking_hours,
  d.experience_years,
  d.equipment_notes,
  d.social_links,
  d.photos,
  d.accepting_bookings,
  d.verification_status,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as rating,
  count(r.id)::integer as review_count
from public.dj_profiles d
join public.profiles p on p.id = d.profile_id and p.role = 'dj'
left join public.reviews r on r.dj_id = d.profile_id
where d.is_active
  and d.verification_status = 'verified'
group by p.id, d.profile_id;

alter table public.profiles enable row level security;
alter table public.host_profiles enable row level security;
alter table public.dj_profiles enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.disputes enable row level security;
alter table public.user_reports enable row level security;
alter table public.uploaded_media enable row level security;
alter table public.platform_settings enable row level security;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_public_dj_read on public.profiles;
create policy profiles_public_dj_read on public.profiles
  for select to anon, authenticated
  using (
    role = 'dj'
    and exists (
      select 1 from public.dj_profiles d
      where d.profile_id = profiles.id
        and d.is_active
        and d.verification_status = 'verified'
    )
  );
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists host_profiles_self_or_admin on public.host_profiles;
create policy host_profiles_self_or_admin on public.host_profiles
  for all to authenticated
  using (
    profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'host')
    or public.is_admin()
  )
  with check (
    profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'host')
    or public.is_admin()
  );

drop policy if exists dj_profiles_public_read on public.dj_profiles;
create policy dj_profiles_public_read on public.dj_profiles
  for select to anon, authenticated
  using (
    (is_active and verification_status = 'verified')
    or profile_id = auth.uid()
    or public.is_admin()
  );
drop policy if exists dj_profiles_owner_insert on public.dj_profiles;
create policy dj_profiles_owner_insert on public.dj_profiles
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'dj')
  );
drop policy if exists dj_profiles_owner_update on public.dj_profiles;
create policy dj_profiles_owner_update on public.dj_profiles
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
drop policy if exists dj_profiles_owner_delete on public.dj_profiles;
create policy dj_profiles_owner_delete on public.dj_profiles
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists availability_read_public_or_owner on public.availability_blocks;
create policy availability_read_public_or_owner on public.availability_blocks
  for select to anon, authenticated
  using (
    (
      status = 'available'
      and exists (
        select 1 from public.dj_profiles d
        where d.profile_id = dj_id
          and d.is_active
          and d.accepting_bookings
          and d.verification_status = 'verified'
      )
    )
    or dj_id = auth.uid()
    or public.is_admin()
  );
drop policy if exists availability_owner_insert on public.availability_blocks;
create policy availability_owner_insert on public.availability_blocks
  for insert to authenticated
  with check (dj_id = auth.uid());
drop policy if exists availability_owner_update on public.availability_blocks;
create policy availability_owner_update on public.availability_blocks
  for update to authenticated
  using (dj_id = auth.uid() or public.is_admin())
  with check (dj_id = auth.uid() or public.is_admin());
drop policy if exists availability_owner_delete on public.availability_blocks;
create policy availability_owner_delete on public.availability_blocks
  for delete to authenticated
  using (dj_id = auth.uid() or public.is_admin());

drop policy if exists bookings_participant_read on public.bookings;
create policy bookings_participant_read on public.bookings
  for select to authenticated
  using (host_id = auth.uid() or dj_id = auth.uid() or public.is_admin());
drop policy if exists bookings_host_create on public.bookings;
create policy bookings_host_create on public.bookings
  for insert to authenticated
  with check (
    host_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'host')
  );

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations
  for select to authenticated
  using (host_id = auth.uid() or dj_id = auth.uid() or public.is_admin());

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.dj_id)
    ) or public.is_admin()
  );
drop policy if exists messages_participant_send on public.messages;
create policy messages_participant_send on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.dj_id)
    )
  );
drop policy if exists messages_recipient_mark_read on public.messages;
create policy messages_recipient_mark_read on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.dj_id)
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.dj_id)
    )
  );

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid() or public.is_admin());
drop policy if exists notifications_mark_own_read on public.notifications;
create policy notifications_mark_own_read on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists favorites_owner_access on public.favorites;
create policy favorites_owner_access on public.favorites
  for all to authenticated
  using (host_id = auth.uid() or public.is_admin())
  with check (
    host_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'host')
    or public.is_admin()
  );

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (true);
drop policy if exists reviews_host_insert_completed on public.reviews;
create policy reviews_host_insert_completed on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.host_id = auth.uid()
        and b.dj_id = reviews.dj_id
        and b.status = 'completed'
    )
  );

drop policy if exists payments_participant_read on public.payments;
create policy payments_participant_read on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and auth.uid() in (b.host_id, b.dj_id)
    ) or public.is_admin()
  );
drop policy if exists payouts_owner_read on public.payouts;
create policy payouts_owner_read on public.payouts
  for select to authenticated
  using (dj_id = auth.uid() or public.is_admin());
drop policy if exists disputes_participant_read on public.disputes;
create policy disputes_participant_read on public.disputes
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and auth.uid() in (b.host_id, b.dj_id)
    ) or public.is_admin()
  );
drop policy if exists disputes_participant_insert on public.disputes;
create policy disputes_participant_insert on public.disputes
  for insert to authenticated
  with check (opened_by = auth.uid());
drop policy if exists disputes_admin_update on public.disputes;
create policy disputes_admin_update on public.disputes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists reports_reporter_create on public.user_reports;
create policy reports_reporter_create on public.user_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_admin_read on public.user_reports;
create policy reports_admin_read on public.user_reports
  for select to authenticated
  using (public.is_admin());
drop policy if exists reports_admin_update on public.user_reports;
create policy reports_admin_update on public.user_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists media_public_read on public.uploaded_media;
create policy media_public_read on public.uploaded_media
  for select to anon, authenticated
  using (is_public or owner_id = auth.uid() or public.is_admin());
drop policy if exists media_owner_insert on public.uploaded_media;
create policy media_owner_insert on public.uploaded_media
  for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists media_owner_update on public.uploaded_media;
create policy media_owner_update on public.uploaded_media
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists media_owner_delete on public.uploaded_media;
create policy media_owner_delete on public.uploaded_media
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists settings_read_authenticated on public.platform_settings;
create policy settings_read_authenticated on public.platform_settings
  for select to authenticated
  using (true);
drop policy if exists settings_admin_write on public.platform_settings;
create policy settings_admin_write on public.platform_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to anon, authenticated;
revoke select on public.profiles from anon;
grant select (id, role, display_name, avatar_url, city) on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.host_profiles to authenticated;
grant select (
  profile_id, stage_name, bio, genres, event_types, hourly_rate_minor, currency,
  minimum_booking_hours, experience_years, equipment_notes, social_links, photos,
  accepting_bookings, verification_status, is_active
) on public.dj_profiles to anon;
grant select on public.dj_profiles to authenticated;
grant insert (
  profile_id, stage_name, bio, genres, event_types, hourly_rate_minor,
  currency, minimum_booking_hours, experience_years, equipment_notes,
  social_links, photos, accepting_bookings, is_active
) on public.dj_profiles to authenticated;
grant update (
  stage_name, bio, genres, event_types, hourly_rate_minor, currency,
  minimum_booking_hours, experience_years, equipment_notes, social_links,
  photos, accepting_bookings, is_active
) on public.dj_profiles to authenticated;
grant update (verification_status) on public.dj_profiles to authenticated;
grant delete on public.dj_profiles to authenticated;
grant select, insert, update, delete on public.availability_blocks to authenticated;
grant select on public.availability_blocks to anon;
grant select on public.bookings to authenticated;
grant insert (
  host_id, dj_id, event_type, starts_at, ends_at, venue, location,
  guest_count, event_details, music_preferences, special_requests
) on public.bookings to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, delete on public.favorites to authenticated;
revoke select on public.reviews from anon, authenticated;
grant select (id, booking_id, dj_id, rating, body, created_at) on public.reviews to anon, authenticated;
grant insert (booking_id, reviewer_id, dj_id, rating, body) on public.reviews to authenticated;
grant select on public.payments, public.payouts, public.disputes to authenticated;
grant insert (booking_id, opened_by, reason) on public.disputes to authenticated;
grant update (status, resolution) on public.disputes to authenticated;
grant insert (reporter_id, reported_user_id, reason, details) on public.user_reports to authenticated;
grant select, update (status) on public.user_reports to authenticated;
grant select, insert, update, delete on public.uploaded_media to authenticated;
grant select on public.uploaded_media to anon;
grant select, insert, update on public.platform_settings to authenticated;
grant select on public.public_dj_profiles to anon, authenticated;

revoke delete on public.profiles from authenticated;
revoke delete on public.bookings from authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.payouts from anon, authenticated;

revoke all on function public.respond_to_booking(uuid, boolean) from public;
revoke all on function public.cancel_booking(uuid) from public;
revoke all on function public.complete_booking(uuid) from public;
grant execute on function public.respond_to_booking(uuid, boolean) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dj-portfolio',
  'dj-portfolio',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists dj_portfolio_public_read on storage.objects;
create policy dj_portfolio_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'dj-portfolio');
drop policy if exists dj_portfolio_owner_upload on storage.objects;
create policy dj_portfolio_owner_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dj-portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists dj_portfolio_owner_update on storage.objects;
create policy dj_portfolio_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dj-portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'dj-portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists dj_portfolio_owner_delete on storage.objects;
create policy dj_portfolio_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dj-portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
