import { requireSupabase } from './supabase';
import type { MarketplaceRole } from './auth-context';

export type PublicDj = {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  stage_name: string;
  bio: string;
  genres: string[];
  event_types: string[];
  hourly_rate_minor: number;
  currency: string;
  minimum_booking_hours: number;
  experience_years: number;
  equipment_notes: string;
  social_links: Record<string, string>;
  photos: string[];
  accepting_bookings: boolean;
  verification_status: string;
  rating: number;
  review_count: number;
};

export type Booking = {
  id: string;
  host_id: string;
  dj_id: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  location: string;
  guest_count: number;
  event_details: string;
  music_preferences: string;
  special_requests: string;
  status: string;
  quoted_amount_minor: number;
  currency: string;
  created_at: string;
};

export type BookingInput = {
  hostId: string;
  djId: string;
  eventType: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  location: string;
  guestCount: number;
  eventDetails: string;
  musicPreferences: string;
  specialRequests: string;
};

export type AvailabilityBlock = {
  id: string;
  dj_id: string;
  starts_at: string;
  ends_at: string;
  status: 'available' | 'blocked';
};

export type Conversation = {
  id: string;
  booking_id: string;
  host_id: string;
  dj_id: string;
  created_at: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Notification = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listPublicDjs(filters: {
  search?: string;
  city?: string;
  genre?: string;
  eventType?: string;
  maxRate?: number;
  minRating?: number;
  minExperience?: number;
  availableOn?: string;
  sort?: 'rating' | 'price' | 'experience' | 'reviews';
} = {}) {
  const client = requireSupabase();
  let availableDjIds: string[] | null = null;
  if (filters.availableOn) {
    const dayStart = new Date(`${filters.availableOn}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const { data, error } = await client
      .from('availability_blocks')
      .select('dj_id')
      .eq('status', 'available')
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString());
    if (error) throw error;
    availableDjIds = [...new Set((data ?? []).map((row) => row.dj_id as string))];
    if (!availableDjIds.length) return [] as PublicDj[];
  }
  let query = client
    .from('public_dj_profiles')
    .select('*')
    .eq('accepting_bookings', true)
    .eq('verification_status', 'verified')
    .limit(60);

  const search = filters.search?.trim().replace(/[%_]/g, '\\$&');
  const city = filters.city?.trim().replace(/[%_]/g, '\\$&');
  if (search) query = query.ilike('stage_name', `%${search}%`);
  if (city) query = query.ilike('city', `%${city}%`);
  if (filters.genre) query = query.contains('genres', [filters.genre]);
  if (filters.eventType) query = query.contains('event_types', [filters.eventType]);
  if (availableDjIds) query = query.in('profile_id', availableDjIds);
  if (filters.maxRate !== undefined) {
    query = query.lte('hourly_rate_minor', Math.round(filters.maxRate * 100));
  }
  if (filters.minRating !== undefined) query = query.gte('rating', filters.minRating);
  if (filters.minExperience !== undefined) query = query.gte('experience_years', filters.minExperience);
  if (filters.sort === 'price') query = query.order('hourly_rate_minor', { ascending: true });
  else if (filters.sort === 'experience') query = query.order('experience_years', { ascending: false });
  else if (filters.sort === 'reviews') query = query.order('review_count', { ascending: false }).order('rating', { ascending: false });
  else query = query.order('rating', { ascending: false }).order('review_count', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PublicDj[];
}

export async function getPublicDj(id: string) {
  const { data, error } = await requireSupabase()
    .from('public_dj_profiles')
    .select('*')
    .eq('profile_id', id)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (error) throw error;
  return (data as PublicDj | null) ?? null;
}

export async function getMyDjProfile(id: string) {
  const { data, error } = await requireSupabase()
    .from('dj_profiles')
    .select('*')
    .eq('profile_id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyHostProfile(id: string) {
  const { data, error } = await requireSupabase()
    .from('host_profiles')
    .select('profile_id, organization_name, phone')
    .eq('profile_id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDjReviews(djId: string) {
  const { data, error } = await requireSupabase()
    .from('reviews')
    .select('id, rating, body, created_at')
    .eq('dj_id', djId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function getReviewForBooking(bookingId: string) {
  const { data, error } = await requireSupabase()
    .from('reviews')
    .select('id, rating, body, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReview(input: {
  bookingId: string;
  reviewerId: string;
  djId: string;
  rating: number;
  body: string;
}) {
  const { data, error } = await requireSupabase()
    .from('reviews')
    .insert({
      booking_id: input.bookingId,
      reviewer_id: input.reviewerId,
      dj_id: input.djId,
      rating: input.rating,
      body: input.body.trim(),
    })
    .select('id, rating, body, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function listPublicAvailability(djId: string) {
  const { data, error } = await requireSupabase()
    .from('availability_blocks')
    .select('id, dj_id, starts_at, ends_at, status')
    .eq('dj_id', djId)
    .eq('status', 'available')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as AvailabilityBlock[];
}

export async function isFavorite(hostId: string, djId: string) {
  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('dj_id')
    .eq('host_id', hostId)
    .eq('dj_id', djId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleFavorite(hostId: string, djId: string) {
  const client = requireSupabase();
  const current = await isFavorite(hostId, djId);
  if (current) {
    const { error } = await client
      .from('favorites')
      .delete()
      .eq('host_id', hostId)
      .eq('dj_id', djId);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from('favorites').insert({ host_id: hostId, dj_id: djId });
  if (error) throw error;
  return true;
}

export async function listFavoriteDjIds(hostId: string) {
  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('dj_id')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.dj_id as string);
}

export async function createBookingRequest(input: BookingInput) {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .insert({
      host_id: input.hostId,
      dj_id: input.djId,
      event_type: input.eventType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      venue: input.venue,
      location: input.location,
      guest_count: input.guestCount,
      event_details: input.eventDetails,
      music_preferences: input.musicPreferences,
      special_requests: input.specialRequests,
    })
    .select('id, host_id, dj_id, event_type, starts_at, ends_at, venue, location, guest_count, event_details, music_preferences, special_requests, status, quoted_amount_minor, currency, created_at')
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function listMyBookings(userId: string, role: MarketplaceRole) {
  const column = role === 'dj' ? 'dj_id' : 'host_id';
  const { data, error } = await requireSupabase()
    .from('bookings')
    .select('*')
    .eq(column, userId)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function getBooking(id: string) {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Booking | null) ?? null;
}

export async function listFavoriteDjs(hostId: string) {
  const client = requireSupabase();
  const favoriteIds = await listFavoriteDjIds(hostId);
  if (!favoriteIds.length) return [] as PublicDj[];
  const { data, error } = await client
    .from('public_dj_profiles')
    .select('*')
    .in('profile_id', favoriteIds);
  if (error) throw error;
  return (data ?? []) as PublicDj[];
}

export async function respondToBooking(bookingId: string, accept: boolean) {
  const { data, error } = await requireSupabase()
    .rpc('respond_to_booking', { p_booking_id: bookingId, p_accept: accept });
  if (error) throw error;
  return data as Booking;
}

export async function cancelBooking(bookingId: string) {
  const { data, error } = await requireSupabase()
    .rpc('cancel_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return data as Booking;
}

export async function completeBooking(bookingId: string) {
  const { data, error } = await requireSupabase()
    .rpc('complete_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return data as Booking;
}

export async function listAvailability(djId: string) {
  const { data, error } = await requireSupabase()
    .from('availability_blocks')
    .select('id, dj_id, starts_at, ends_at, status')
    .eq('dj_id', djId)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvailabilityBlock[];
}

export async function saveAvailability(input: Omit<AvailabilityBlock, 'id'> & { id?: string }) {
  const client = requireSupabase();
  const { id, ...values } = input;
  const result = id
    ? await client.from('availability_blocks').update(values).eq('id', id).select().single()
    : await client.from('availability_blocks').insert(values).select().single();
  if (result.error) throw result.error;
  return result.data as AvailabilityBlock;
}

export async function removeAvailability(id: string) {
  const { error } = await requireSupabase().from('availability_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function listConversations(userId: string) {
  const client = requireSupabase();
  const [asHost, asDj] = await Promise.all([
    client.from('conversations').select('*').eq('host_id', userId),
    client.from('conversations').select('*').eq('dj_id', userId),
  ]);
  if (asHost.error) throw asHost.error;
  if (asDj.error) throw asDj.error;
  const rows = [...(asHost.data ?? []), ...(asDj.data ?? [])] as Conversation[];
  return rows.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export async function listMessages(conversationId: string) {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { data, error } = await requireSupabase()
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markMessageRead(messageId: string) {
  const { error } = await requireSupabase()
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function listNotifications(userId: string) {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id, notification_type, title, body, booking_id, read_at, created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function listMyPayments(userId: string, role: MarketplaceRole) {
  const client = requireSupabase();
  if (role === 'dj') {
    const { data, error } = await client
      .from('payouts')
      .select('id, payment_id, amount_minor, currency, status, created_at')
      .eq('dj_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  if (role === 'admin') {
    const { data, error } = await client
      .from('payments')
      .select('id, booking_id, amount_minor, platform_fee_minor, currency, status, refund_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  }

  const bookingIds = await listMyBookings(userId, role).then((rows) => rows.map((row) => row.id));
  if (!bookingIds.length) return [];
  const { data, error } = await client
    .from('payments')
    .select('id, booking_id, amount_minor, platform_fee_minor, currency, status, refund_status, created_at')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminProfiles() {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, role, display_name, avatar_url, city, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAdminBookings() {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function listAdminDjs() {
  const { data, error } = await requireSupabase()
    .from('dj_profiles')
    .select('profile_id, stage_name, verification_status, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function setDjVerification(
  djId: string,
  status: 'unverified' | 'pending' | 'verified' | 'rejected',
) {
  const { data, error } = await requireSupabase()
    .from('dj_profiles')
    .update({ verification_status: status })
    .eq('profile_id', djId)
    .select('profile_id, stage_name, verification_status, is_active')
    .single();
  if (error) throw error;
  return data;
}

export async function getPlatformSettings() {
  const { data, error } = await requireSupabase()
    .from('platform_settings')
    .select('commission_basis_points, updated_at')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePlatformCommission(basisPoints: number) {
  const { data, error } = await requireSupabase()
    .from('platform_settings')
    .upsert(
      { singleton: true, commission_basis_points: basisPoints },
      { onConflict: 'singleton' },
    )
    .select('commission_basis_points, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function upsertDjProfile(input: {
  profile_id: string;
  stage_name: string;
  bio: string;
  genres: string[];
  event_types: string[];
  hourly_rate_minor: number;
  currency: string;
  minimum_booking_hours: number;
  experience_years: number;
  equipment_notes: string;
  social_links: Record<string, string>;
  photos: string[];
  accepting_bookings: boolean;
}) {
  const { data, error } = await requireSupabase()
    .from('dj_profiles')
    .upsert(input, { onConflict: 'profile_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertHostProfile(input: {
  profile_id: string;
  organization_name: string;
  phone: string;
}) {
  const { profile_id, ...values } = input;
  const { data, error } = await requireSupabase()
    .from('host_profiles')
    .upsert({ profile_id, ...values }, { onConflict: 'profile_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePublicProfile(
  id: string,
  input: { display_name: string; avatar_url: string | null; city: string | null },
) {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select('id, role, display_name, avatar_url, city')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadDjMedia(
  ownerId: string,
  file: File,
  mediaType: 'avatar' | 'portfolio',
) {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Images must be 10 MB or smaller.');
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const objectPath = `${ownerId}/${mediaType}/${crypto.randomUUID()}.${extension}`;
  const client = requireSupabase();
  const storage = client.storage.from('dj-portfolio');
  const { data: uploaded, error: uploadError } = await storage.upload(objectPath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const publicUrl = storage.getPublicUrl(uploaded.path).data.publicUrl;
  const { error: metadataError } = await client.from('uploaded_media').insert({
    owner_id: ownerId,
    object_path: uploaded.path,
    media_type: mediaType,
    is_public: true,
  });
  if (metadataError) {
    await storage.remove([uploaded.path]);
    throw metadataError;
  }
  return publicUrl;
}
