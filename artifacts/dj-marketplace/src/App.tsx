import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { DjCard } from '@/components/dj-card';
import {
  AuthProvider,
  errorMessage,
  useAuth,
} from '@/lib/auth-context';
import {
  type Booking,
  cancelBooking,
  completeBooking,
  createReview,
  createBookingRequest,
  getBooking,
  getReviewForBooking,
  getDjReviews,
  getMyDjProfile,
  getMyHostProfile,
  getPublicDj,
  getPlatformSettings,
  isFavorite,
  listAdminBookings,
  listAdminDjs,
  listAdminProfiles,
  listAvailability,
  listConversations,
  listFavoriteDjs,
  listMessages,
  listMyBookings,
  listMyPayments,
  listNotifications,
  listPublicAvailability,
  listPublicDjs,
  markNotificationRead,
  markMessageRead,
  removeAvailability,
  respondToBooking,
  saveAvailability,
  savePlatformCommission,
  setDjVerification,
  sendMessage,
  toggleFavorite,
  updatePublicProfile,
  uploadDjMedia,
  upsertDjProfile,
  upsertHostProfile,
} from '@/lib/marketplace';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, BadgeCheck, CalendarDays,
  Check, Clock3, Disc3, Headphones, Heart, LockKeyhole, MapPin, Menu, Music2,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, WalletCards, X,
} from 'lucide-react';
import {
  Route, Switch, useLocation, useParams, Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const hasSupabase = isSupabaseConfigured;
const dashLinks = [
  { href: '/dashboard', label: 'Overview', icon: AudioLines },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/dashboard/messages', label: 'Messages', icon: Music2 },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Sparkles },
  { href: '/dashboard/favorites', label: 'Saved DJs', icon: Heart },
  { href: '/dashboard/availability', label: 'Availability', icon: Clock3 },
  { href: '/dashboard/earnings', label: 'Earnings', icon: WalletCards },
  { href: '/dashboard/profile', label: 'Public profile', icon: Headphones },
  { href: '/dashboard/account', label: 'Account', icon: LockKeyhole },
];

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

type ViewerRole = 'guest' | 'host' | 'dj' | 'admin';
function Header({ role: roleOverride }: { role?: ViewerRole }) {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const role = roleOverride ?? auth.role ?? 'guest';
  const accountHref = role === 'admin' ? '/admin' : '/dashboard';
  const accountLabel = role === 'dj' ? 'DJ workspace' : role === 'admin' ? 'Admin' : 'My workspace';
  return <header className="sticky top-0 z-30 border-b border-[#e5e0d3] bg-[#f8f6ef]/95 backdrop-blur-md">
    <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between px-5 md:px-9">
      <a href="/" className="flex items-center gap-2.5" data-testid="link-home">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#285a4d] text-[#f8f6ef]"><AudioLines size={19}/></span>
        <span className="text-[1.32rem] font-extrabold tracking-[-.07em] text-[#23473c]">encore<span className="text-[#e77c5a]">.</span></span>
      </a>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
        <a className="text-sm font-semibold text-[#4f655c] transition hover:text-[#e17b59]" href="/djs" data-testid="link-browse-djs">Find a DJ</a>
        <a className="text-sm font-semibold text-[#4f655c] transition hover:text-[#e17b59]" href="/#how-it-works" data-testid="link-how-it-works">How it works</a>
        <a className="text-sm font-semibold text-[#4f655c] transition hover:text-[#e17b59]" href="/onboarding/dj" data-testid="link-for-djs">For DJs</a>
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        {role === 'guest' ? <><a href="/login" className="px-3 py-2 text-sm font-bold text-[#34564b] hover:text-[#df7858]" data-testid="link-login">Log in</a><a href="/signup" className="btn btn-primary !px-5 !py-3" data-testid="link-get-started">Get started <ArrowRight size={15}/></a></> : <><a href={accountHref} className="px-3 py-2 text-sm font-bold text-[#34564b] hover:text-[#df7858]" data-testid="link-workspace">{accountLabel}</a><a href="/dashboard/account" className="btn btn-outline !px-5 !py-3" data-testid="link-account">Account</a><button className="px-3 py-2 text-sm font-bold text-[#6c7972] hover:text-[#df7858]" onClick={() => void auth.signOut()} data-testid="button-sign-out">Log out</button></>}
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-xl text-[#31564a] md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">{open ? <X/> : <Menu/>}</button>
    </div>
    {open && <nav className="flex flex-col gap-1 border-t border-[#e5e0d3] bg-[#f8f6ef] p-4 md:hidden">
      <a onClick={() => setOpen(false)} className="rounded-xl p-3 font-semibold" href="/djs">Find a DJ</a>
      <a onClick={() => setOpen(false)} className="rounded-xl p-3 font-semibold" href="/#how-it-works">How it works</a>
      <a onClick={() => setOpen(false)} className="rounded-xl p-3 font-semibold" href="/onboarding/dj">For DJs</a>
      {role === 'guest' ? <div className="flex gap-2 p-2"><a className="btn btn-outline flex-1" href="/login">Log in</a><a className="btn btn-primary flex-1" href="/signup">Get started</a></div> : <a onClick={() => setOpen(false)} className="rounded-xl p-3 font-semibold" href={accountHref}>{accountLabel}</a>}
    </nav>}
  </header>;
}

function Footer() {
  return <footer className="border-t border-[#dcd9ce] bg-[#f1efe7]">
    <div className="mx-auto grid max-w-[1280px] gap-9 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-9">
      <div><a href="/" className="text-xl font-extrabold tracking-[-.07em] text-[#23473c]">encore<span className="text-[#e77c5a]">.</span></a><p className="mt-3 max-w-xs text-sm leading-6 text-[#65766d]">Good events deserve the right soundtrack. Find your person, make a plan, make it a night.</p></div>
      <div><p className="eyebrow mb-4">Explore</p><div className="grid gap-3 text-sm font-semibold text-[#496259]"><a href="/djs">Browse DJs</a><a href="/onboarding/dj">List your DJ profile</a><a href="/onboarding/host">Plan an event</a></div></div>
      <div><p className="eyebrow mb-4">The details</p><div className="grid gap-3 text-sm font-semibold text-[#496259]"><a href="/terms">Terms of service</a><a href="/privacy">Privacy</a><a href="/cancellation-policy">Cancellation policy</a></div></div>
    </div>
    <div className="mx-auto flex max-w-[1280px] flex-col gap-2 border-t border-[#dcd9ce] px-5 py-5 text-xs text-[#77877f] md:flex-row md:justify-between md:px-9"><span>© Encore. Made for the moments that matter.</span><span className="mono">A better night starts here.</span></div>
  </footer>;
}

function Layout({ children, minimal = false }: { children: ReactNode; minimal?: boolean }) {
  return <div className="grain min-h-[100dvh]"><Header/><main>{children}</main>{!minimal && <Footer/>}</div>;
}

function Notice({ title = 'Encore is getting ready', description = 'Connect Supabase to securely load live profiles, bookings, and account data.', icon = <Disc3 size={22}/> }: {title?: string; description?: string; icon?: ReactNode}) {
  return <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center" data-testid="notice-data-unavailable">
    <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#e8eee6] text-[#315c4c]">{icon}</div>
    <h3 className="serif text-2xl font-semibold text-[#29483e]">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-6 text-[#718078]">{description}</p>
    {!hasSupabase && <div className="mt-5 rounded-xl border border-[#e5dfcf] bg-[#f1efe7] px-4 py-3 text-left text-xs leading-5 text-[#6b746d]"><strong className="text-[#38574b]">Setup needed</strong><br/>Add SUPABASE_URL and SUPABASE_ANON_KEY to enable live data and authentication.</div>}
  </div>;
}

function SectionHeading({ kicker, title, detail, href, linkLabel }: {kicker:string; title:string; detail?:string; href?:string; linkLabel?:string}) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{kicker}</p><h2 className="serif mt-2 text-3xl font-semibold tracking-[-.035em] text-[#29483e] md:text-[2.5rem]">{title}</h2>{detail && <p className="mt-2 text-sm text-[#718078]">{detail}</p>}</div>{href && <a href={href} className="inline-flex items-center gap-2 text-sm font-bold text-[#42685a] hover:text-[#df7858]">{linkLabel}<ArrowRight size={15}/></a>}</div>;
}

function ListingState({ loading, error, emptyTitle, emptyDescription, retry }: {
  loading: boolean;
  error: unknown;
  emptyTitle: string;
  emptyDescription: string;
  retry?: () => void;
}) {
  if (loading) {
    return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading DJs">
      {[0, 1, 2].map((item) => <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-[#e6e1d5] bg-[#fffdf8]">
        <div className="aspect-[1.28/1] bg-[#e8eee6]"/><div className="space-y-3 p-4"><div className="h-4 w-1/2 rounded bg-[#e8eee6]"/><div className="h-3 w-3/4 rounded bg-[#f1efe7]"/><div className="h-10 rounded bg-[#f1efe7]"/></div>
      </div>)}
    </div>;
  }
  if (error) {
    return <div className="soft-card"><Notice title="We couldn’t load the DJ directory" description={errorMessage(error)} icon={<Disc3 size={22}/>} /><div className="-mt-7 pb-7 text-center"><button className="btn btn-outline" onClick={retry} data-testid="button-retry-djs">Try again</button></div></div>;
  }
  return <div className="soft-card"><Notice title={emptyTitle} description={emptyDescription} icon={<Search size={22}/>} /></div>;
}

function Home() {
  const featured = useQuery({
    queryKey: ['public-djs', 'featured'],
    queryFn: () => listPublicDjs(),
    enabled: hasSupabase,
    staleTime: 30_000,
  });
  return <Layout>
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 pb-16 pt-14 md:grid-cols-[1.03fr_.97fr] md:items-center md:px-9 md:pb-24 md:pt-20">
        <div className="page-in relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d8dfd4] bg-[#eff3eb] px-3.5 py-2 text-xs font-bold text-[#42685a]"><span className="h-1.5 w-1.5 rounded-full bg-[#e47b58]"/>THE RIGHT DJ. THE RIGHT MOMENT.</div>
          <h1 className="serif max-w-[650px] text-[3.45rem] font-semibold leading-[.99] tracking-[-.055em] text-[#25463c] sm:text-[4.4rem] md:text-[5.25rem]">A great night<br/>has a <em className="text-[#df7858]">soundtrack.</em></h1>
          <p className="mt-6 max-w-[490px] text-[1.05rem] leading-7 text-[#697970]">Meet the DJs who know how to read a room. Book with clarity, talk through the details, and get back to planning the good part.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a className="btn btn-primary" href="/djs">Find your DJ <ArrowRight size={16}/></a><a className="btn btn-outline" href="/onboarding/dj">I’m a DJ <ArrowDownRight size={16}/></a></div>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-[#688076]"><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[#4c7b66]"/>Clear booking steps</span><span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-[#4c7b66]"/>Real profiles, real people</span></div>
        </div>
        <div className="page-in relative mx-auto w-full max-w-[590px] [animation-delay:120ms]">
          <div className="absolute -left-5 top-12 h-24 w-24 rounded-full border border-[#e4a58d]/55 md:-left-10"/>
          <div className="relative overflow-hidden rounded-[28px] bg-[#244b40] p-6 text-[#f5f0df] shadow-[0_30px_70px_rgba(40,76,63,.2)] sm:p-9">
            <div className="absolute -right-10 -top-20 h-60 w-60 rounded-full border border-[#a5b8a0]/20"/><div className="absolute -right-1 top-16 h-36 w-36 rounded-full border border-[#a5b8a0]/15"/>
            <div className="relative flex items-center justify-between"><span className="eyebrow !text-[#b2c5b5]">A little more in tune</span><span className="mono text-[10px] text-[#b2c5b5]">ENCORE / 001</span></div>
            <div className="relative mt-14 flex items-end gap-1.5" aria-label="Decorative audio waveform">{Array.from({length:42},(_,i)=><span key={i} className="wave-bar flex-1 rounded-full bg-[#e2a181]" style={{height:`${14+Math.abs(Math.sin(i*.7)*58)+Math.abs(Math.cos(i*.22)*25)}px`}}/>)}</div>
            <div className="relative mt-9 flex items-end justify-between border-t border-[#789187]/35 pt-5"><div><p className="serif text-3xl">Made for your moment.</p><p className="mt-2 text-sm text-[#b8c8bd]">From the first hello to the last song.</p></div><div className="grid h-12 w-12 place-items-center rounded-full border border-[#b8c8bd]/40"><ArrowDownRight size={20}/></div></div>
          </div>
          <div className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-[#e4dfd2] bg-[#fffdf7] px-4 py-3 shadow-lg sm:block"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8eee6] text-[#42685a]"><Check size={16}/></span><span className="text-xs font-bold text-[#38574b]">Details, in the open</span></div></div>
        </div>
      </div>
    </section>
    <section className="border-y border-[#e5e0d3] bg-[#f1efe7]"><div className="mx-auto grid max-w-[1280px] gap-5 px-5 py-8 md:grid-cols-3 md:px-9">
      {[{n:'01',t:'Find your sound',d:'Explore DJs by style, city, and the kind of event you’re putting together.'},{n:'02',t:'Get on the same page',d:'Share the details and talk through the set before anything is confirmed.'},{n:'03',t:'Make it official',d:'See the status at every step. Payments unlock when secure checkout is connected.'}].map(x=><div className="flex gap-4" key={x.n}><span className="mono mt-1 text-xs text-[#e17b59]">{x.n}</span><div><h3 className="font-extrabold text-[#35584b]">{x.t}</h3><p className="mt-1.5 max-w-sm text-sm leading-6 text-[#75827a]">{x.d}</p></div></div>)}
    </div></section>
    <section id="how-it-works" className="mx-auto max-w-[1280px] px-5 py-16 md:px-9 md:py-24"><SectionHeading kicker="A good place to start" title="The right fit is out there." detail="Browse a real, growing community of working DJs." href="/djs" linkLabel="Browse DJs"/>
      {!hasSupabase ? <div className="soft-card"><Notice title="No DJ profiles to show yet" description="Public DJ profiles will appear here once Encore is connected to its Supabase project."/></div> : featured.isLoading ? <ListingState loading error={null} emptyTitle="" emptyDescription=""/> : featured.isError ? <ListingState loading={false} error={featured.error} emptyTitle="" emptyDescription="" retry={() => void featured.refetch()}/> : featured.data?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(featured.data??[]).slice(0,3).map((dj)=><DjCard key={dj.profile_id} dj={dj}/>)}</div> : <ListingState loading={false} error={null} emptyTitle="No DJ profiles to show yet" emptyDescription="There are no public profiles available right now. Check back soon."/>}
    </section>
    <section className="mx-auto max-w-[1280px] px-5 pb-16 md:px-9 md:pb-24"><div className="relative overflow-hidden rounded-[28px] bg-[#e7eee5] px-6 py-10 md:flex md:items-center md:justify-between md:px-12 md:py-12"><div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border border-[#9cb39e]/40"/><div className="relative max-w-2xl"><p className="eyebrow">For the people behind the decks</p><h2 className="serif mt-3 text-3xl font-semibold text-[#29483e] md:text-4xl">Good at reading the room?<br/><em>Let the room find you.</em></h2><p className="mt-3 text-sm leading-6 text-[#66796e]">Build a profile that says what you play, where you play, and what makes your sets yours.</p></div><a href="/onboarding/dj" className="btn btn-primary relative mt-6 md:mt-0">Join as a DJ <ArrowRight size={16}/></a></div></section>
  </Layout>;
}

function Browse() {
  const [query,setQuery]=useState('');
  const [city,setCity]=useState('');
  const [genre,setGenre]=useState('');
  const [eventType,setEventType]=useState('');
  const [maxRate,setMaxRate]=useState('');
  const [minimumRating,setMinimumRating]=useState('');
  const [minimumExperience,setMinimumExperience]=useState('');
  const [availableOn,setAvailableOn]=useState('');
  const [sort,setSort]=useState<'rating'|'price'|'experience'|'reviews'>('rating');
  const listings=useQuery({
    queryKey:['public-djs',{query,city,genre,eventType,maxRate,minimumRating,minimumExperience,availableOn,sort}],
    queryFn:()=>listPublicDjs({
      search:query,
      city,
      genre,
      eventType,
      maxRate:maxRate ? Number(maxRate) : undefined,
      minRating:minimumRating ? Number(minimumRating) : undefined,
      minExperience:minimumExperience ? Number(minimumExperience) : undefined,
      availableOn:availableOn||undefined,
      sort,
    }),
    enabled:hasSupabase,
    staleTime:20_000,
  });
  return <Layout><div className="mx-auto min-h-[65vh] max-w-[1280px] px-5 py-12 md:px-9 md:py-16">
    <p className="eyebrow">The Encore directory</p><div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="serif text-4xl font-semibold tracking-[-.04em] text-[#29483e] md:text-5xl">Find your sound.</h1><p className="mt-3 text-[#718078]">Search by location, genre, or the event you’re dreaming up.</p></div><span className="status-pill inline-flex w-fit items-center gap-2"><ShieldCheck size={14}/>Profiles shown when verified</span></div>
    <div className="mt-9 grid gap-3 rounded-2xl border border-[#e3dfd3] bg-[#f1efe7] p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
      <label className="relative"><span className="sr-only">Search DJs</span><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#728078]"/><input className="field !pl-11" placeholder="DJ name" value={query} onChange={e=>setQuery(e.target.value)} data-testid="input-dj-search"/></label>
      <label className="relative"><span className="sr-only">City</span><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#728078]"/><input className="field !pl-10" placeholder="City or region" value={city} onChange={e=>setCity(e.target.value)} data-testid="input-city"/></label>
      <label><span className="sr-only">Genre</span><select value={genre} onChange={e=>setGenre(e.target.value)} className="field appearance-none" data-testid="select-genre"><option value="">Any sound</option><option>House</option><option>Disco</option><option>Hip-hop</option><option>Open format</option><option>Afrobeats</option></select></label>
      <label><span className="sr-only">Event type</span><select value={eventType} onChange={e=>setEventType(e.target.value)} className="field appearance-none" data-testid="select-event-type-filter"><option value="">Any event</option><option>Wedding</option><option>Private party</option><option>Corporate event</option><option>Community event</option></select></label>
      <label><span className="sr-only">Maximum hourly rate</span><select value={maxRate} onChange={e=>setMaxRate(e.target.value)} className="field appearance-none" data-testid="select-max-rate"><option value="">Any price</option><option value="50">Up to £50 / hr</option><option value="100">Up to £100 / hr</option><option value="200">Up to £200 / hr</option><option value="500">Up to £500 / hr</option></select></label>
      <button className="btn btn-primary !rounded-xl !px-5" onClick={()=>void listings.refetch()} data-testid="button-search-djs"><SlidersHorizontal size={16}/> Explore</button>
    </div>
    <div className="mt-3 grid gap-3 rounded-2xl border border-[#e3dfd3] bg-[#fffdf8] p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label><span className="label">Available on</span><input type="date" min={new Date().toISOString().slice(0,10)} className="field" value={availableOn} onChange={e=>setAvailableOn(e.target.value)} data-testid="filter-availability-date"/></label>
      <label><span className="label">Minimum rating</span><select className="field" value={minimumRating} onChange={e=>setMinimumRating(e.target.value)} data-testid="filter-min-rating"><option value="">Any rating</option><option value="3">3 stars or more</option><option value="4">4 stars or more</option><option value="4.5">4.5 stars or more</option></select></label>
      <label><span className="label">Experience</span><select className="field" value={minimumExperience} onChange={e=>setMinimumExperience(e.target.value)} data-testid="filter-experience"><option value="">Any experience</option><option value="2">2+ years</option><option value="5">5+ years</option><option value="10">10+ years</option></select></label>
      <label><span className="label">Sort by</span><select className="field" value={sort} onChange={e=>setSort(e.target.value as typeof sort)} data-testid="select-sort-djs"><option value="rating">Top rated</option><option value="reviews">Most reviewed</option><option value="price">Lowest hourly rate</option><option value="experience">Most experienced</option></select></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#76827a]"><span>{hasSupabase ? `${listings.data?.length ?? 0} live listings` : 'Showing live listings only'}</span>{query && <span>· “{query}”</span>}{city && <span>· {city}</span>}{genre && <span>· {genre}</span>}{eventType && <span>· {eventType}</span>}{maxRate && <span>· Up to £{maxRate}/hr</span>}{minimumRating&&<span>· {minimumRating}+ stars</span>}{minimumExperience&&<span>· {minimumExperience}+ years</span>}{availableOn&&<span>· Available {availableOn}</span>}</div>
    <div className="mt-8">{!hasSupabase ? <div className="soft-card"><Notice title="The directory is ready for its first DJs" description="DJs will appear here once the Supabase connection and public directory are configured. We don’t display invented profiles." icon={<Search size={22}/>} /></div> : listings.isLoading ? <ListingState loading error={null} emptyTitle="" emptyDescription=""/> : listings.isError ? <ListingState loading={false} error={listings.error} emptyTitle="" emptyDescription="" retry={() => void listings.refetch()}/> : listings.data?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(listings.data??[]).map((dj)=><DjCard key={dj.profile_id} dj={dj}/>)}</div> : <ListingState loading={false} error={null} emptyTitle="No DJs match just yet" emptyDescription="Try adjusting your filters, or check back as more DJs join Encore."/>}</div>
  </div></Layout>;
}

function DJProfile() {
  const { id = '' } = useParams<{ id: string }>();
  const auth=useAuth();
  const queryClient=useQueryClient();
  const djQuery=useQuery({queryKey:['dj-profile',id],queryFn:()=>getPublicDj(id),enabled:hasSupabase&&Boolean(id)});
  const reviewsQuery=useQuery({queryKey:['dj-reviews',id],queryFn:()=>getDjReviews(id),enabled:hasSupabase&&Boolean(id)&&Boolean(djQuery.data)});
  const availabilityQuery=useQuery({queryKey:['public-availability',id],queryFn:()=>listPublicAvailability(id),enabled:hasSupabase&&Boolean(id)&&Boolean(djQuery.data)});
  const favoriteQuery=useQuery({queryKey:['favorite',auth.user?.id,id],queryFn:()=>isFavorite(auth.user!.id,id),enabled:hasSupabase&&auth.role==='host'&&Boolean(id)});
  const favoriteMutation=useMutation({
    mutationFn:()=>toggleFavorite(auth.user!.id,id),
    onSuccess:(saved)=>{queryClient.setQueryData(['favorite',auth.user?.id,id],saved);void queryClient.invalidateQueries({queryKey:['favorite-djs',auth.user?.id]});},
  });
  if(!hasSupabase)return <Layout><div className="mx-auto max-w-[1060px] px-5 py-8 md:px-9"><a href="/djs" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-[#587065]"><ArrowLeft size={16}/>Back to DJs</a><div className="soft-card"><Notice title="This DJ profile isn’t available yet" description="Connect Supabase to load real public DJ profiles. Encore does not display invented profiles." icon={<Headphones size={22}/>} /></div></div></Layout>;
  if(djQuery.isLoading)return <Layout><div className="mx-auto max-w-[1060px] px-5 py-12 md:px-9"><div className="animate-pulse soft-card p-8"><div className="h-64 rounded-2xl bg-[#e8eee6]"/><div className="mt-6 h-8 w-1/3 rounded bg-[#e8eee6]"/></div></div></Layout>;
  if(djQuery.isError||!djQuery.data)return <Layout><div className="mx-auto max-w-[1060px] px-5 py-8 md:px-9"><a href="/djs" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-[#587065]"><ArrowLeft size={16}/>Back to DJs</a><div className="soft-card"><Notice title="This DJ profile isn’t available" description={djQuery.isError?errorMessage(djQuery.error):"The profile may be private, inactive, or no longer available."} icon={<Headphones size={22}/>} /></div></div></Layout>;
  const dj=djQuery.data;
  const rate=new Intl.NumberFormat('en-GB',{style:'currency',currency:dj.currency,maximumFractionDigits:0}).format(dj.hourly_rate_minor/100);
  return <Layout><div className="mx-auto max-w-[1060px] px-5 py-8 md:px-9">
    <a href="/djs" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-[#587065]"><ArrowLeft size={16}/>Back to DJs</a>
    <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
      <section className="soft-card overflow-hidden">
        <div className="relative aspect-[1.7/1] bg-[#e8eee6]">{dj.photos[0]?<img src={dj.photos[0]} alt={`${dj.stage_name} performing`} className="h-full w-full object-cover"/>:dj.avatar_url?<img src={dj.avatar_url} alt={`${dj.stage_name}`} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center bg-[radial-gradient(circle_at_72%_28%,#adc4b0_0,transparent_30%),linear-gradient(140deg,#e8eee6,#dbe4d9)]"><span className="serif text-8xl text-[#42685a]/60">{dj.stage_name.slice(0,1).toUpperCase()}</span></div>}</div>
        <div className="p-6 md:p-8"><p className="eyebrow">Encore DJ profile</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="serif text-4xl font-semibold text-[#29483e]">{dj.stage_name}</h1>{dj.verification_status==='verified'&&<span className="status-pill inline-flex items-center gap-1.5"><BadgeCheck size={14}/>Verified</span>}</div><p className="mt-2 flex items-center gap-1.5 text-sm text-[#718078]"><MapPin size={15}/>{dj.city||'Location not set'} · {dj.experience_years} years experience</p>
          <div className="mt-6 flex flex-wrap gap-2">{dj.genres.map((genre)=><span key={genre} className="rounded-full bg-[#e8eee6] px-3 py-1.5 text-xs font-bold text-[#42685a]">{genre}</span>)}</div>
          <h2 className="serif mt-8 text-2xl font-semibold text-[#29483e]">About the sound</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#66776e]">{dj.bio||'This DJ is still adding their introduction.'}</p>
          <h2 className="serif mt-8 text-2xl font-semibold text-[#29483e]">Events and setup</h2><p className="mt-3 text-sm leading-6 text-[#66776e]">{dj.event_types.length?dj.event_types.join(' · '):'Event types not listed yet.'}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#66776e]">{dj.equipment_notes||'Equipment details available on request.'}</p>
          {dj.photos.length>1&&<div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{dj.photos.slice(1,7).map((src,index)=><img key={src} src={src} alt={`${dj.stage_name} portfolio ${index+1}`} className="aspect-square w-full rounded-xl object-cover"/>)}</div>}
        </div>
      </section>
      <aside className="h-fit space-y-5">
        <div className="soft-card p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Starting rate</p><p className="serif mt-2 text-4xl font-semibold text-[#29483e]">{rate}<span className="ml-1 text-sm font-sans font-medium text-[#718078]">/ hour</span></p><p className="mt-1 text-xs text-[#718078]">Minimum booking: {dj.minimum_booking_hours} hours</p></div><div className="text-right"><p className="inline-flex items-center gap-1 font-bold text-[#785f39]"><Star size={14} className="fill-[#d8a957] text-[#d8a957]"/>{dj.review_count?Number(dj.rating).toFixed(1):'New'}</p><p className="mt-1 text-xs text-[#718078]">{dj.review_count} reviews</p></div></div>
          {dj.accepting_bookings?auth.role==='dj'?<div className="btn btn-outline mt-6 w-full justify-center opacity-60" aria-disabled="true">Host account required</div>:<a href={auth.role==='host'?`/book/${dj.profile_id}`:'/login'} className="btn btn-primary mt-6 w-full justify-center" data-testid="link-request-booking">{auth.role==='host'?'Request a booking':'Sign in to request'} <ArrowRight size={15}/></a>:<div className="btn btn-outline mt-6 w-full justify-center opacity-60" aria-disabled="true">Not accepting requests</div>}
          {auth.role==='host'?<button className="btn btn-outline mt-3 w-full justify-center" onClick={()=>favoriteMutation.mutate()} disabled={favoriteMutation.isPending||favoriteQuery.isLoading} data-testid="button-favorite-dj"><Heart size={15} className={favoriteQuery.data?'fill-current':''}/>{favoriteMutation.isPending?'Saving…':favoriteQuery.data?'Saved DJ':'Save DJ'}</button>:<a href={auth.user?'/dashboard':'/login'} className="btn btn-outline mt-3 w-full justify-center" data-testid="link-message-login">{auth.user?'Open messages':'Log in to message'} </a>}
          {favoriteMutation.isError&&<p className="mt-3 text-xs text-red-700" role="alert">{errorMessage(favoriteMutation.error)}</p>}
        </div>
        <div className="soft-card p-6"><p className="eyebrow">Availability</p>{dj.accepting_bookings?<p className="mt-2 text-sm leading-6 text-[#66776e]">Accepting requests. Your date is checked against the DJ’s live availability when you submit.</p>:<p className="mt-2 text-sm leading-6 text-[#66776e]">Not accepting new requests right now.</p>}{availabilityQuery.isLoading?<p className="mt-3 text-xs text-[#718078]">Loading available dates…</p>:availabilityQuery.isError?<p className="mt-3 text-xs text-[#8a5847]">{errorMessage(availabilityQuery.error)}</p>:availabilityQuery.data?.length?<div className="mt-4 space-y-2">{availabilityQuery.data.slice(0,5).map(slot=><p key={slot.id} className="rounded-lg bg-[#f1efe7] px-3 py-2 text-xs text-[#63756c]">{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(slot.starts_at))} – {new Intl.DateTimeFormat('en-GB',{timeStyle:'short'}).format(new Date(slot.ends_at))}</p>)}</div>:<p className="mt-3 text-xs text-[#718078]">No upcoming dates published yet. Submit a request to check a specific date.</p>}<a href={`/book/${dj.profile_id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#42685a]">Ask about an event <ArrowRight size={14}/></a></div>
        <div className="soft-card p-6"><p className="eyebrow">Recent reviews</p>{reviewsQuery.isLoading?<p className="mt-3 text-sm text-[#718078]">Loading reviews…</p>:reviewsQuery.isError?<p className="mt-3 text-sm text-[#718078]">{errorMessage(reviewsQuery.error)}</p>:reviewsQuery.data?.length?reviewsQuery.data.map((review)=><div key={review.id} className="border-b border-[#ece8dd] py-4 last:border-0"><p className="flex items-center gap-1 text-xs font-bold text-[#785f39]"><Star size={13} className="fill-[#d8a957] text-[#d8a957]"/>{review.rating} / 5</p><p className="mt-2 text-sm leading-6 text-[#66776e]">{review.body||'A completed event review.'}</p></div>):<p className="mt-3 text-sm text-[#718078]">No reviews yet.</p>}</div>
      </aside>
    </div>
  </div></Layout>;
}

function BookingReview({booking,userId}:{booking:Booking;userId:string}) {
  const queryClient=useQueryClient();
  const [rating,setRating]=useState('5');
  const [body,setBody]=useState('');
  const review=useQuery({queryKey:['booking-review',booking.id],queryFn:()=>getReviewForBooking(booking.id)});
  const mutation=useMutation({
    mutationFn:()=>createReview({bookingId:booking.id,reviewerId:userId,djId:booking.dj_id,rating:Number(rating),body}),
    onSuccess:()=>{void queryClient.invalidateQueries({queryKey:['booking-review',booking.id]});void queryClient.invalidateQueries({queryKey:['dj-reviews',booking.dj_id]});void queryClient.invalidateQueries({queryKey:['public-djs']});},
  });
  if(review.isLoading)return <p className="mt-4 text-xs text-[#718078]">Checking review status…</p>;
  if(review.data)return <p className="mt-4 rounded-xl bg-[#eef4eb] p-3 text-xs font-semibold text-[#3c684f]" role="status">You reviewed this event: {review.data.rating} / 5.</p>;
  return <form className="mt-5 rounded-xl bg-[#f8f6ef] p-4" onSubmit={e=>{e.preventDefault();mutation.mutate();}}>
    <p className="text-sm font-bold text-[#35584b]">How did it go?</p>
    {review.isError&&<p className="mt-2 text-xs text-red-800" role="alert">{errorMessage(review.error)}</p>}
    {mutation.isError&&<p className="mt-2 text-xs text-red-800" role="alert">{errorMessage(mutation.error)}</p>}
    <div className="mt-3 flex flex-col gap-3 sm:flex-row"><label className="sm:w-36"><span className="label">Rating</span><select className="field" value={rating} onChange={e=>setRating(e.target.value)} data-testid={`review-rating-${booking.id}`}>{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} / 5</option>)}</select></label><label className="flex-1"><span className="label">Review (optional)</span><input className="field" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} placeholder="Share a note about the event" data-testid={`review-body-${booking.id}`}/></label></div>
    <button className="btn btn-primary mt-3 !py-2" type="submit" disabled={mutation.isPending||review.isError} data-testid={`review-submit-${booking.id}`}>{mutation.isPending?'Submitting…':'Submit review'}</button>
  </form>;
}

function BookingRequest() {
  const { id = '' }=useParams<{id:string}>();
  const auth=useAuth();
  const queryClient=useQueryClient();
  const [,setLocation]=useLocation();
  const [eventType,setEventType]=useState('');
  const [date,setDate]=useState('');
  const [startTime,setStartTime]=useState('');
  const [endTime,setEndTime]=useState('');
  const [venue,setVenue]=useState('');
  const [location,setEventLocation]=useState('');
  const [guestCount,setGuestCount]=useState('');
  const [details,setDetails]=useState('');
  const [music,setMusic]=useState('');
  const [specialRequests,setSpecialRequests]=useState('');
  const [validationError,setValidationError]=useState('');
  const dj=useQuery({queryKey:['dj-profile',id],queryFn:()=>getPublicDj(id),enabled:hasSupabase&&Boolean(id)});
  const bookingMutation=useMutation({
    mutationFn:()=>createBookingRequest({
      hostId:auth.user!.id,djId:id,eventType,startsAt:new Date(`${date}T${startTime}`).toISOString(),
      endsAt:new Date(`${date}T${endTime}`).toISOString(),venue,location,guestCount:Number(guestCount),
      eventDetails:details,musicPreferences:music,specialRequests,
    }),
    onSuccess:(booking)=>{void queryClient.invalidateQueries({queryKey:['bookings',auth.user?.id]});void queryClient.invalidateQueries({queryKey:['conversations',auth.user?.id]});void queryClient.invalidateQueries({queryKey:['notifications',auth.user?.id]});setLocation(`/booking-confirmed/${booking.id}`);},
  });
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setValidationError('');
    if(!auth.user||auth.role!=='host'||!date||!startTime||!endTime||!eventType||!venue.trim()||!location.trim()||Number(guestCount)<1)return;
    const start=new Date(`${date}T${startTime}`);const end=new Date(`${date}T${endTime}`);
    if(Number.isNaN(start.valueOf())||Number.isNaN(end.valueOf())){setValidationError('Enter a valid event date and time.');return;}
    if(end<=start){setValidationError('The end time must be after the start time.');return;}
    if(start<new Date()){setValidationError('The event date and time must be in the future.');return;}
    bookingMutation.mutate();
  };
  return <Layout><div className="mx-auto max-w-[1080px] px-5 py-10 md:px-9 md:py-14">
    <a href="/djs" className="inline-flex items-center gap-2 text-sm font-bold text-[#587065]"><ArrowLeft size={16}/>Browse DJs</a>
    <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_340px]">
      <section><p className="eyebrow">Booking request</p><h1 className="serif mt-2 text-4xl font-semibold text-[#29483e]">Start the conversation.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#718078]">Tell the DJ what you’re planning. You’ll review the details together before anything is confirmed.</p>
        <div className="mt-7 soft-card p-5 sm:p-8">
          {!hasSupabase?<Notice title="Booking requests aren’t available yet" description="Connect Supabase to send and save booking requests. The form will not submit until the live database is configured." icon={<CalendarDays size={22}/>} />:!auth.user?<Notice title="Sign in to request this DJ" description="Booking requests are tied to your host account. Sign in or create an account to continue." icon={<CalendarDays size={22}/>} />:auth.role!=='host'?<Notice title="A host account is needed" description="DJ accounts can receive booking requests. Switch to a host account to request this DJ." icon={<CalendarDays size={22}/>} />:null}
          {bookingMutation.isError&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{errorMessage(bookingMutation.error)}</div>}
          {validationError&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{validationError}</div>}
          <form className="mt-2 grid gap-5 sm:grid-cols-2" onSubmit={submit}>
            <label><span className="label">Event type</span><select className="field" value={eventType} onChange={e=>setEventType(e.target.value)} required data-testid="select-event-type"><option value="" disabled>Select an event</option><option>Wedding</option><option>Private party</option><option>Corporate event</option><option>Community event</option><option>Other</option></select></label>
            <label><span className="label">Event date</span><input className="field" type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)} required data-testid="input-event-date"/></label>
            <label><span className="label">Start time</span><input className="field" type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} required data-testid="input-start-time"/></label>
            <label><span className="label">End time</span><input className="field" type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} required data-testid="input-end-time"/></label>
            <label><span className="label">Venue name</span><input className="field" placeholder="Where’s it happening?" value={venue} onChange={e=>setVenue(e.target.value)} required maxLength={160} data-testid="input-venue"/></label>
            <label><span className="label">City or location</span><input className="field" placeholder="City, neighborhood" value={location} onChange={e=>setEventLocation(e.target.value)} required maxLength={160} data-testid="input-location"/></label>
            <label><span className="label">Guest count</span><input className="field" type="number" min="1" max="100000" placeholder="Approximate is fine" value={guestCount} onChange={e=>setGuestCount(e.target.value)} required data-testid="input-guests"/></label>
            <label><span className="label">Music direction</span><input className="field" placeholder="Genres, artists, energy…" value={music} onChange={e=>setMusic(e.target.value)} maxLength={1000} data-testid="input-music"/></label>
            <label className="sm:col-span-2"><span className="label">The details</span><textarea className="field min-h-28 resize-y" placeholder="What should the DJ know about your event?" value={details} onChange={e=>setDetails(e.target.value)} maxLength={3000} data-testid="input-event-details"/></label>
            <label className="sm:col-span-2"><span className="label">Special requests</span><textarea className="field min-h-24 resize-y" placeholder="Anything else to plan around?" value={specialRequests} onChange={e=>setSpecialRequests(e.target.value)} maxLength={2000} data-testid="input-special-requests"/></label>
            {dj.data&&<p className="sm:col-span-2 rounded-xl bg-[#f1efe7] p-3 text-xs leading-5 text-[#6d796f]">The booking quote is calculated from the DJ’s saved rate and event duration in the database. Final booking confirmation requires payment, which is currently unavailable.</p>}
            <button className="btn btn-primary sm:col-span-2" type="submit" disabled={!hasSupabase||!auth.user||auth.role!=='host'||bookingMutation.isPending||dj.isLoading||!dj.data?.accepting_bookings} data-testid="button-send-request">{bookingMutation.isPending?'Sending request…':dj.data?.accepting_bookings?'Send booking request':'Request unavailable'} <ArrowRight size={15}/></button>
          </form>
        </div>
      </section>
      <aside className="h-fit rounded-2xl border border-[#e4dfd2] bg-[#f1efe7] p-5"><p className="eyebrow">What happens next</p><div className="mt-5 grid gap-5">{[{i:'01',t:'Share your plans',d:'Give the DJ a clear picture of your event.'},{i:'02',t:'Agree on the details',d:'Discuss availability, music, timing, and quote.'},{i:'03',t:'Confirm when ready',d:'The booking status stays clear at each step.'}].map(s=><div key={s.i} className="flex gap-3"><span className="mono text-xs text-[#df7858]">{s.i}</span><div><p className="font-bold text-[#35584b]">{s.t}</p><p className="mt-1 text-xs leading-5 text-[#76827a]">{s.d}</p></div></div>)}</div></aside>
    </div>
  </div></Layout>;
}

function Checkout() {
  return <Layout><div className="mx-auto max-w-[760px] px-5 py-14 md:px-9"><a href="/dashboard/bookings" className="inline-flex items-center gap-2 text-sm font-bold text-[#587065]"><ArrowLeft size={16}/>Back to bookings</a><div className="mt-8 soft-card p-6 md:p-10"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#f8e9e1] text-[#c36c4e]"><WalletCards size={22}/></div><p className="eyebrow">Secure checkout</p><h1 className="serif mt-2 text-4xl font-semibold text-[#29483e]">Payments aren’t connected.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#718078]">Encore checkout will be available when Stripe is connected. No payment has been taken, and this booking has not been marked paid or confirmed.</p><div className="mt-7 rounded-xl border border-[#e7d7c9] bg-[#fbf1e9] p-4 text-sm leading-6 text-[#795d4e]"><strong>For now:</strong> contact the host or DJ through the booking conversation to agree on next steps. Please don’t send payment details here.</div><a href="/dashboard/bookings" className="btn btn-primary mt-7">Return to bookings <ArrowRight size={15}/></a></div></div></Layout>;
}

function Confirmed() {
  const { id = '' }=useParams<{id:string}>();
  const auth=useAuth();
  const booking=useQuery({queryKey:['booking',id],queryFn:()=>getBooking(id),enabled:hasSupabase&&Boolean(id)&&Boolean(auth.user)});
  const label=booking.data?.status==='pending'?'Request sent':booking.data?.status==='accepted'?'DJ accepted your request':'Request received';
  return <Layout><div className="mx-auto max-w-[750px] px-5 py-16"><div className="soft-card p-7 text-center md:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8eee6] text-[#456e59]"><Check size={24}/></div><p className="eyebrow mt-6">{label}</p><h1 className="serif mt-2 text-4xl font-semibold text-[#29483e]">You’re in the conversation.</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#718078]">{booking.data?.status?`Current status: ${booking.data.status.replaceAll('_',' ')}. `:''}This is a booking request, not a payment confirmation. Checkout is unavailable until Stripe Connect is configured.</p>{booking.isError&&<p className="mt-3 text-xs text-[#718078]" role="status">The request was sent, but its status could not be loaded. Check your bookings for updates.</p>}<div className="mt-8 flex flex-wrap justify-center gap-3"><a href="/dashboard/bookings" className="btn btn-primary">View bookings <ArrowRight size={15}/></a><a href="/dashboard/messages" className="btn btn-outline">Open messages</a></div></div></div></Layout>;
}

function AuthPage({ signup = false }: {signup?:boolean}) {
  const auth=useAuth();
  const [,setLocation]=useLocation();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [role,setRole]=useState<'host'|'dj'>('host');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [pendingEmail,setPendingEmail]=useState('');
  const onSubmit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError('');setNotice('');
    if(!auth.configured){setError('Authentication is unavailable until Supabase is configured.');return;}
    setBusy(true);
    try{
      if(signup){
        const result=await auth.signUp(email,password,role,displayName);
        if(result.confirmationRequired){setPendingEmail(email.trim());setNotice('Check your inbox to confirm your account. The email can take a few minutes; check your spam folder too.');}
        else setLocation(role==='dj'?'/onboarding/dj':'/onboarding/host');
      }else{
        await auth.signIn(email,password);
        setLocation('/dashboard');
      }
    }catch(err){
      const message=errorMessage(err);
      if(/email not confirmed/i.test(message)){setPendingEmail(email.trim());setError('Please confirm your email address before signing in. Check your inbox, or resend the confirmation email below.');}
      else setError(message);
    }
    finally{setBusy(false);}
  };
  const onResend=async()=>{
    setError('');setNotice('');
    if(!pendingEmail){setError('Enter your email address first.');return;}
    setBusy(true);
    try{await auth.resendConfirmation(pendingEmail);setNotice(`We sent a new confirmation email to ${pendingEmail}.`);}
    catch(err){setError(errorMessage(err));}
    finally{setBusy(false);}
  };
  const onReset=async()=>{
    setError('');setNotice('');
    if(!auth.configured){setError('Password reset is unavailable until Supabase is configured.');return;}
    if(!email.trim()){setError('Enter your email address first.');return;}
    setBusy(true);
    try{await auth.resetPassword(email);setNotice('If an account exists for that address, a password reset link has been sent.');}
    catch(err){setError(errorMessage(err));}
    finally{setBusy(false);}
  };
  return <Layout><div className="mx-auto grid min-h-[72vh] max-w-[1050px] items-center gap-8 px-5 py-10 md:grid-cols-[.9fr_1.1fr] md:px-9">
    <div className="hidden rounded-[26px] bg-[#244b40] p-9 text-[#f5f0df] md:block"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#8ca397]/40 text-[#e1a181]"><AudioLines/></div><p className="eyebrow mt-12 !text-[#bbcabf]">Meet the moment</p><h2 className="serif mt-3 text-4xl leading-tight">Good music.<br/><em>Good people.</em><br/>Better nights.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-[#c1d0c5]">A considered way to find, book, and work with DJs who fit your event.</p></div>
    <div className="soft-card mx-auto w-full max-w-md p-6 sm:p-9"><p className="eyebrow">{signup ? 'Start with Encore' : 'Welcome back'}</p><h1 className="serif mt-2 text-3xl font-semibold text-[#29483e]">{signup ? 'Make room for a good night.' : 'Pick up where you left off.'}</h1><p className="mt-2 text-sm text-[#718078]">{signup ? 'Create an account to plan an event or build your DJ profile.' : 'Sign in to manage your bookings and conversations.'}</p>
       {!auth.configured&&<div className="mt-6 rounded-xl border border-[#e7d7c9] bg-[#fbf1e9] p-4 text-xs leading-5 text-[#795d4e]"><strong>Supabase setup needed</strong><br/>Supabase is not connected yet. Add its project URL and anon key to the project's environment settings to enable secure sign-in.</div>}
       {error&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
       {notice&&<div className="mt-4 rounded-xl border border-[#d9e4d7] bg-[#eef4eb] p-3 text-sm text-[#3c604b]" role="status">{notice}</div>}
       {pendingEmail&&!busy&&<button type="button" onClick={()=>void onResend()} className="mt-3 w-full text-center text-sm font-bold text-[#42685a] underline decoration-[#a9bcae] underline-offset-4" data-testid="button-resend-confirmation">Resend confirmation email</button>}
       <form className="mt-6 grid gap-4" onSubmit={onSubmit}>{signup&&<label><span className="label">Your name</span><input className="field" type="text" autoComplete="name" value={displayName} onChange={e=>setDisplayName(e.target.value)} required maxLength={80} data-testid="input-display-name"/></label>}<label><span className="label">Email address</span><input className="field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required data-testid="input-email"/></label><label><span className="label">Password</span><input className="field" type="password" autoComplete={signup?'new-password':'current-password'} placeholder={signup?'At least 8 characters':'Your password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={signup?8:1} data-testid="input-password"/></label>{signup && <label><span className="label">I’m here as</span><select className="field" value={role} onChange={e=>setRole(e.target.value as 'host'|'dj')} data-testid="select-account-role"><option value="host">Planning an event</option><option value="dj">A DJ looking for bookings</option></select></label>}<button type="submit" disabled={!auth.configured||busy} className="btn btn-primary mt-1 w-full disabled:opacity-55" data-testid="button-auth-submit">{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form>
       {!signup&&<button type="button" onClick={()=>void onReset()} disabled={!auth.configured||busy} className="mt-4 w-full text-center text-sm font-bold text-[#42685a] underline decoration-[#a9bcae] underline-offset-4 disabled:opacity-50" data-testid="button-reset-password">Forgot password?</button>}
      <p className="mt-6 text-center text-sm text-[#718078]">{signup ? 'Already have an account?' : 'New to Encore?'} <a className="font-extrabold text-[#42685a] underline decoration-[#a9bcae] underline-offset-4" href={signup?'/login':'/signup'}>{signup?'Log in':'Create an account'}</a></p>
    </div>
  </div></Layout>;
}

function ResetPassword() {
  const auth=useAuth();
  const [,setLocation]=useLocation();
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError('');setNotice('');
    if(password.length<8){setError('Use at least 8 characters for your new password.');return;}
    if(password!==confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try{await auth.updatePassword(password);setNotice('Your password has been updated.');setLocation('/dashboard');}
    catch(err){setError(errorMessage(err));}
    finally{setBusy(false);}
  };
  return <Layout><div className="mx-auto grid min-h-[68vh] max-w-[900px] items-center px-5 py-12 md:grid-cols-[.8fr_1fr] md:px-9"><div className="mb-8 md:mb-0"><p className="eyebrow">Account security</p><h1 className="serif mt-3 text-4xl font-semibold text-[#29483e]">Choose a new password.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-[#718078]">Open this page from the password-reset email to securely update your Encore account.</p></div><div className="soft-card p-6 md:p-8">{!auth.configured?<Notice title="Password reset is unavailable" description="Connect Supabase to enable account recovery." icon={<LockKeyhole size={22}/>} />:auth.loading?<p className="text-sm text-[#718078]">Checking your recovery link…</p>:!auth.user?<><Notice title="Open your recovery link" description="This page needs an active recovery link from Supabase. Request another link if this one has expired." icon={<LockKeyhole size={22}/>} /><a href="/login" className="btn btn-outline mt-2 w-full justify-center">Back to sign in</a></>:<form className="grid gap-4" onSubmit={submit}>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}{notice&&<p className="rounded-xl bg-[#eef4eb] p-3 text-sm text-[#3c604b]" role="status">{notice}</p>}<label><span className="label">New password</span><input className="field" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required data-testid="input-new-password"/></label><label><span className="label">Confirm new password</span><input className="field" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} required data-testid="input-confirm-password"/></label><button className="btn btn-primary w-full" type="submit" disabled={busy} data-testid="button-update-password">{busy?'Updating…':'Update password'}</button></form>}</div></div></Layout>;
}

function Onboarding({dj=false}:{dj?:boolean}) {
  const auth=useAuth();const [,setLocation]=useLocation();
  const [stageName,setStageName]=useState('');const [displayName,setDisplayName]=useState(auth.profile?.display_name??'');
  const [city,setCity]=useState(auth.profile?.city??'');const [bio,setBio]=useState('');const [genres,setGenres]=useState('');
  const [eventTypes,setEventTypes]=useState('');const [rate,setRate]=useState('');const [experience,setExperience]=useState('0');
  const [equipment,setEquipment]=useState('');const [socialLinks,setSocialLinks]=useState('');
  const [organization,setOrganization]=useState('');const [phone,setPhone]=useState('');
  const [avatarUrl,setAvatarUrl]=useState(auth.profile?.avatar_url??'');const [photoUrls,setPhotoUrls]=useState<string[]>([]);
  const [mediaBusy,setMediaBusy]=useState(false);const [mediaError,setMediaError]=useState('');
  const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
  const djProfileQuery=useQuery({queryKey:['my-dj-profile',auth.user?.id],queryFn:()=>getMyDjProfile(auth.user!.id),enabled:hasSupabase&&dj&&Boolean(auth.user)});
  const hostProfileQuery=useQuery({queryKey:['my-host-profile',auth.user?.id],queryFn:()=>getMyHostProfile(auth.user!.id),enabled:hasSupabase&&!dj&&Boolean(auth.user)});
  useEffect(()=>{
    if(auth.profile){setDisplayName(auth.profile.display_name??'');setCity(auth.profile.city??'');setAvatarUrl(auth.profile.avatar_url??'');}
    if(dj&&djProfileQuery.data){
      const profile=djProfileQuery.data;
      setStageName(profile.stage_name??'');setBio(profile.bio??'');
      setGenres((profile.genres??[]).join(', '));setEventTypes((profile.event_types??[]).join(', '));
      setRate(String((profile.hourly_rate_minor??0)/100));setExperience(String(profile.experience_years??0));
      setEquipment(profile.equipment_notes??'');setSocialLinks(JSON.stringify(profile.social_links??{},null,2));
      setPhotoUrls(profile.photos??[]);
    }
    if(!dj&&hostProfileQuery.data){setOrganization(hostProfileQuery.data.organization_name??'');setPhone(hostProfileQuery.data.phone??'');}
  },[auth.profile,dj,djProfileQuery.data,hostProfileQuery.data]);
  const uploadFiles=async(event:ChangeEvent<HTMLInputElement>,mediaType:'avatar'|'portfolio')=>{
    const files=Array.from(event.currentTarget.files??[]);
    event.currentTarget.value='';
    if(!files.length||!auth.user)return;
    setMediaError('');setMediaBusy(true);
    try{
      const urls=await Promise.all(files.map(file=>uploadDjMedia(auth.user!.id,file,mediaType)));
      if(mediaType==='avatar')setAvatarUrl(urls[0]);
      else setPhotoUrls(current=>[...new Set([...current,...urls])]);
    }catch(err){setMediaError(errorMessage(err));}
    finally{setMediaBusy(false);}
  };
  const save=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError('');setSaved(false);
    if(!hasSupabase){setError('Supabase is not configured yet.');return;}
    if(!auth.user){setLocation('/login');return;}
    if(dj&&auth.role!=='dj'){setError('A DJ account is required to create a DJ profile.');return;}
    if(!dj&&auth.role!=='host'){setError('A host account is required to create a host profile.');return;}
    setBusy(true);
    try{
      await updatePublicProfile(auth.user.id,{display_name:displayName.trim(),avatar_url:avatarUrl||null,city:city.trim()||null});
      if(dj){
        let links:Record<string,string>={};
        if(socialLinks.trim())links=JSON.parse(socialLinks);
        await upsertDjProfile({
          profile_id:auth.user.id,stage_name:stageName.trim(),bio:bio.trim(),
          genres:genres.split(',').map(x=>x.trim()).filter(Boolean),
          event_types:eventTypes.split(',').map(x=>x.trim()).filter(Boolean),
          hourly_rate_minor:Math.round(Number(rate)*100),currency:'GBP',
          minimum_booking_hours:1,experience_years:Number(experience),
          equipment_notes:equipment.trim(),social_links:links,photos:photoUrls,
          accepting_bookings:true,
        });
      }else{
        await upsertHostProfile({profile_id:auth.user.id,organization_name:organization.trim(),phone:phone.trim()});
      }
      await auth.refreshProfile();setSaved(true);setLocation('/dashboard');
    }catch(err){setError(errorMessage(err));}
    finally{setBusy(false);}
  };
  if(!hasSupabase)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><p className="eyebrow">{dj?'For DJs':'For hosts'}</p><h1 className="serif mt-3 text-4xl font-semibold text-[#29483e]">{dj?'Put your sound out there.':'Plan the night you want.'}</h1><div className="mt-7 soft-card"><Notice title="Account setup is waiting for Supabase" description="Connect Supabase (project URL and anon key) to create accounts and save profiles." icon={dj?<Headphones size={22}/>:<CalendarDays size={22}/>} /></div></div></Layout>;
  if(!auth.user)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><p className="eyebrow">{dj?'For DJs':'For hosts'}</p><h1 className="serif mt-3 text-4xl font-semibold text-[#29483e]">{dj?'Put your sound out there.':'Plan the night you want.'}</h1><div className="mt-7 soft-card p-7 text-center"><p className="text-sm text-[#718078]">Sign in or create an account to save your profile details.</p><a href="/signup" className="btn btn-primary mt-5">Create your account <ArrowRight size={15}/></a></div></div></Layout>;
  return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9 md:py-16"><p className="eyebrow">{dj?'For DJs':'For hosts'}</p><div className="mt-3 grid gap-8 md:grid-cols-[1fr_.7fr]"><section><h1 className="serif text-4xl font-semibold leading-tight text-[#29483e] md:text-5xl">{dj?'Put your sound out there.':'Plan the night you want.'}</h1><p className="mt-4 max-w-xl leading-7 text-[#718078]">{dj?'Build a profile that helps the right events find you, with your genres, experience, and availability up front.':'Tell us a little about who is planning your event.'}</p>
    {auth.role!==(dj?'dj':'host')?<div className="mt-7 soft-card p-5"><Notice title="This profile type doesn’t match your account" description="Create a new account with the matching host or DJ role to continue." icon={<LockKeyhole size={22}/>} /></div>:<form className="mt-7 soft-card grid gap-4 p-5 sm:grid-cols-2 sm:p-7" onSubmit={save}>
      {error&&<div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
      {saved&&<div className="sm:col-span-2 rounded-xl border border-[#d9e4d7] bg-[#eef4eb] p-3 text-sm text-[#3c604b]" role="status">Your profile has been saved.</div>}
      <label><span className="label">Your name</span><input className="field" value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80} required data-testid="input-profile-name"/></label>
      <label><span className="label">City or region</span><input className="field" value={city} onChange={e=>setCity(e.target.value)} maxLength={120} required data-testid="input-profile-city"/></label>
      <label className="sm:col-span-2"><span className="label">Profile image</span><input className="field" type="file" accept="image/jpeg,image/png,image/webp" disabled={mediaBusy} onChange={e=>void uploadFiles(e,'avatar')} data-testid="input-avatar-upload"/>{avatarUrl&&<img src={avatarUrl} alt="Profile preview" className="mt-3 h-20 w-20 rounded-full object-cover"/>}</label>
      {dj?<><label><span className="label">DJ / stage name</span><input className="field" value={stageName} onChange={e=>setStageName(e.target.value)} maxLength={100} required data-testid="input-stage-name"/></label>
        <label><span className="label">Hourly rate (£)</span><input className="field" type="number" min="1" max="10000" step="1" value={rate} onChange={e=>setRate(e.target.value)} required data-testid="input-hourly-rate"/></label>
        <label><span className="label">Genres, comma-separated</span><input className="field" value={genres} onChange={e=>setGenres(e.target.value)} placeholder="House, disco, open format" required data-testid="input-genres"/></label>
        <label><span className="label">Event types, comma-separated</span><input className="field" value={eventTypes} onChange={e=>setEventTypes(e.target.value)} placeholder="Weddings, private parties" required data-testid="input-event-types"/></label>
        <label><span className="label">Years of experience</span><input className="field" type="number" min="0" max="100" value={experience} onChange={e=>setExperience(e.target.value)} data-testid="input-experience"/></label>
        <label><span className="label">Social / music links (JSON, optional)</span><input className="field" value={socialLinks} onChange={e=>setSocialLinks(e.target.value)} placeholder='{"soundcloud":"https://…"}' data-testid="input-social-links"/></label>
        <label className="sm:col-span-2"><span className="label">Bio</span><textarea className="field min-h-28" value={bio} onChange={e=>setBio(e.target.value)} maxLength={3000} data-testid="input-dj-bio"/></label>
        <label className="sm:col-span-2"><span className="label">Equipment and setup</span><textarea className="field min-h-20" value={equipment} onChange={e=>setEquipment(e.target.value)} maxLength={1500} data-testid="input-equipment"/></label>
        <label className="sm:col-span-2"><span className="label">Portfolio photos</span><input className="field" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={mediaBusy} onChange={e=>void uploadFiles(e,'portfolio')} data-testid="input-portfolio-upload"/><p className="mt-1 text-xs text-[#829087]">JPG, PNG, or WebP, up to 10 MB each.</p>{photoUrls.length>0&&<div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{photoUrls.map(src=><img key={src} src={src} alt="DJ portfolio preview" className="aspect-square w-full rounded-lg object-cover"/>)}</div>}</label>
      </>:<><label><span className="label">Organization (optional)</span><input className="field" value={organization} onChange={e=>setOrganization(e.target.value)} maxLength={160} data-testid="input-organization"/></label><label><span className="label">Phone (optional)</span><input className="field" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={40} data-testid="input-phone"/></label></>}
      {mediaError&&<p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{mediaError}</p>}
      {mediaBusy&&<p className="sm:col-span-2 text-xs text-[#718078]" role="status">Uploading image…</p>}
      <button className="btn btn-primary sm:col-span-2" type="submit" disabled={busy} data-testid="button-save-onboarding">{busy?'Saving…':'Save profile'} <ArrowRight size={15}/></button>
    </form>}</section><aside className="soft-card h-fit p-6"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8eee6] text-[#42685a]">{dj?<Headphones/>:<CalendarDays/>}</div><h2 className="serif mt-5 text-2xl text-[#29483e]">{dj?'Independent, together.':'Less guesswork. More good nights.'}</h2><p className="mt-3 text-sm leading-6 text-[#718078]">Encore keeps profile and booking details behind account-specific access rules. Payment and payouts will only become available after secure checkout is connected.</p><div className="mt-5 border-t border-[#e6e1d5] pt-4 text-xs text-[#728078]">Your profile is private until it is saved and marked active.</div></aside></div></div></Layout>;
}

function Dashboard({section='Overview'}:{section?:string}) {
  const auth=useAuth();
  const queryClient=useQueryClient();
  const userId=auth.user?.id??'';
  const role=auth.role;
  const enabled=hasSupabase&&Boolean(userId)&&Boolean(role);
  const [selectedConversation,setSelectedConversation]=useState('');
  const [messageText,setMessageText]=useState('');
  const [slotStart,setSlotStart]=useState('');
  const [slotEnd,setSlotEnd]=useState('');
  const [slotStatus,setSlotStatus]=useState<'available'|'blocked'>('available');
  const [settingsName,setSettingsName]=useState(auth.profile?.display_name??'');
  const [settingsCity,setSettingsCity]=useState(auth.profile?.city??'');
  const [settingsMessage,setSettingsMessage]=useState('');
  const bookingsQuery=useQuery({queryKey:['bookings',userId,role],queryFn:()=>listMyBookings(userId,role!),enabled});
  const conversationsQuery=useQuery({queryKey:['conversations',userId],queryFn:()=>listConversations(userId),enabled});
  const notificationsQuery=useQuery({queryKey:['notifications',userId],queryFn:()=>listNotifications(userId),enabled});
  const favoritesQuery=useQuery({queryKey:['favorite-djs',userId],queryFn:()=>listFavoriteDjs(userId),enabled:enabled&&role==='host'});
  const availabilityQuery=useQuery({queryKey:['availability',userId],queryFn:()=>listAvailability(userId),enabled:enabled&&role==='dj'});
  const paymentsQuery=useQuery({queryKey:['payments',userId,role],queryFn:()=>listMyPayments(userId,role!),enabled});
  const djSettingsQuery=useQuery({queryKey:['my-dj-profile',userId],queryFn:()=>getMyDjProfile(userId),enabled:enabled&&role==='dj'});
  const hostSettingsQuery=useQuery({queryKey:['my-host-profile',userId],queryFn:()=>getMyHostProfile(userId),enabled:enabled&&role==='host'});
  const currentConversation=selectedConversation||conversationsQuery.data?.[0]?.id||'';
  const messagesQuery=useQuery({queryKey:['messages',currentConversation],queryFn:()=>listMessages(currentConversation),enabled:enabled&&Boolean(currentConversation)});
  useEffect(()=>{setSettingsName(auth.profile?.display_name??'');setSettingsCity(auth.profile?.city??'');},[auth.profile?.display_name,auth.profile?.city]);
  useEffect(()=>{if(selectedConversation&&conversationsQuery.data&&!conversationsQuery.data.some(c=>c.id===selectedConversation))setSelectedConversation('');},[selectedConversation,conversationsQuery.data]);
  const invalidateWorkspace=()=>{
    void queryClient.invalidateQueries({queryKey:['bookings',userId]});
    void queryClient.invalidateQueries({queryKey:['conversations',userId]});
    void queryClient.invalidateQueries({queryKey:['notifications',userId]});
    void queryClient.invalidateQueries({queryKey:['messages']});
  };
  const respondMutation=useMutation({mutationFn:({id,accept}:{id:string;accept:boolean})=>respondToBooking(id,accept),onSuccess:invalidateWorkspace});
  const cancelMutation=useMutation({mutationFn:(id:string)=>cancelBooking(id),onSuccess:invalidateWorkspace});
  const completeMutation=useMutation({mutationFn:(id:string)=>completeBooking(id),onSuccess:invalidateWorkspace});
  const sendMutation=useMutation({mutationFn:()=>sendMessage(currentConversation,userId,messageText),onSuccess:()=>{setMessageText('');invalidateWorkspace();}});
  const readNotificationMutation=useMutation({mutationFn:(id:string)=>markNotificationRead(id),onSuccess:()=>void queryClient.invalidateQueries({queryKey:['notifications',userId]})});
  const readMessageMutation=useMutation({mutationFn:(id:string)=>markMessageRead(id),onSuccess:()=>void queryClient.invalidateQueries({queryKey:['messages',currentConversation]})});
  const saveSlotMutation=useMutation({mutationFn:()=>saveAvailability({dj_id:userId,starts_at:new Date(slotStart).toISOString(),ends_at:new Date(slotEnd).toISOString(),status:slotStatus}),onSuccess:()=>{setSlotStart('');setSlotEnd('');void queryClient.invalidateQueries({queryKey:['availability',userId]});}});
  const deleteSlotMutation=useMutation({mutationFn:(id:string)=>removeAvailability(id),onSuccess:()=>void queryClient.invalidateQueries({queryKey:['availability',userId]})});
  const saveAccountMutation=useMutation({mutationFn:()=>updatePublicProfile(userId,{display_name:settingsName.trim(),avatar_url:auth.profile?.avatar_url??null,city:settingsCity.trim()||null}),onSuccess:async()=>{await auth.refreshProfile();setSettingsMessage('Your account details were saved.');}});
  const conversations=conversationsQuery.data??[];
  const bookings=bookingsQuery.data??[];
  const notifications=notificationsQuery.data??[];
  const unreadCount=notifications.filter(n=>!n.read_at).length;
  const activeLinks=dashLinks.filter(item=>role==='dj'?item.label!=='Saved DJs':item.label!=='Availability'&&item.label!=='Earnings'&&item.label!=='Public profile');
  const formatWhen=(value:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  const statusClass=(status:string)=>status==='confirmed'||status==='completed'?'bg-[#e5f0e4] text-[#3c684f]':status==='declined'||status==='cancelled'||status==='refunded'?'bg-[#f5e8e1] text-[#8a5847]':status==='accepted'?'bg-[#e8edf4] text-[#4c6280]':'bg-[#f5efdc] text-[#806b35]';

  if(!hasSupabase)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><div className="soft-card"><Notice title="Your workspace is waiting" description="Connect Supabase (project URL and anon key), then apply the database migration to load account and booking data." icon={<AudioLines size={22}/>} /></div></div></Layout>;
  if(auth.loading)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-20 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#42685a] border-t-transparent"/><p className="mt-4 text-sm text-[#718078]">Loading your workspace…</p></div></Layout>;
  if(!auth.user)return <Layout><div className="mx-auto max-w-[850px] px-5 py-16"><div className="soft-card"><Notice title="Sign in to open your workspace" description="Your bookings, messages, and saved DJs are private to your account. Sign in to continue." icon={<LockKeyhole size={22}/>} /><div className="-mt-7 pb-7 text-center"><a href="/login" className="btn btn-primary">Sign in <ArrowRight size={15}/></a></div></div></div></Layout>;
  if(!role)return <Layout><div className="mx-auto max-w-[850px] px-5 py-16"><div className="soft-card"><Notice title="Your profile is still being prepared" description="Your account exists, but its marketplace profile is not ready yet. Refresh shortly or contact support if this continues." icon={<Clock3 size={22}/>} /></div></div></Layout>;

  const actionError=respondMutation.error||cancelMutation.error||completeMutation.error||sendMutation.error||readNotificationMutation.error||readMessageMutation.error||saveSlotMutation.error||deleteSlotMutation.error||saveAccountMutation.error;
  const renderBookings=()=>bookingsQuery.isLoading?<p className="p-6 text-sm text-[#718078]">Loading bookings…</p>:bookingsQuery.isError?<div className="p-5 text-sm text-red-800" role="alert">{errorMessage(bookingsQuery.error)}</div>:bookings.length===0?<Notice title="No bookings yet" description={role==='host'?'Browse live DJ profiles and send a request when you find the right fit.':'New host requests will appear here.'} icon={<CalendarDays size={22}/>} />:<div className="divide-y divide-[#ece8dd]">{bookings.map(booking=><article key={booking.id} className="p-5 sm:p-6" data-testid={`booking-${booking.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{booking.event_type}</p><h3 className="serif mt-1 text-xl font-semibold text-[#29483e]">{booking.venue}</h3><p className="mt-1 text-xs text-[#718078]">{booking.location} · {formatWhen(booking.starts_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(booking.status)}`} data-testid={`status-booking-${booking.id}`}>{booking.status.replaceAll('_',' ')}</span></div><p className="mt-4 text-sm text-[#66776e]">{booking.guest_count} guests · Quote {new Intl.NumberFormat('en-GB',{style:'currency',currency:booking.currency,maximumFractionDigits:0}).format(booking.quoted_amount_minor/100)}</p>{booking.music_preferences&&<p className="mt-2 text-sm text-[#718078]">Music: {booking.music_preferences}</p>}<div className="mt-4 flex flex-wrap gap-2">{role==='dj'&&booking.status==='pending'&&<><button className="btn btn-primary !py-2" onClick={()=>respondMutation.mutate({id:booking.id,accept:true})} disabled={respondMutation.isPending} data-testid={`button-accept-${booking.id}`}>Accept request</button><button className="btn btn-outline !py-2" onClick={()=>respondMutation.mutate({id:booking.id,accept:false})} disabled={respondMutation.isPending} data-testid={`button-decline-${booking.id}`}>Decline</button></>}{['pending','accepted','payment_pending'].includes(booking.status)&&<button className="btn btn-outline !py-2" onClick={()=>{if(window.confirm('Cancel this booking request? The history will be retained.'))cancelMutation.mutate(booking.id);}} disabled={cancelMutation.isPending} data-testid={`button-cancel-${booking.id}`}>Cancel request</button>}{role==='host'&&booking.status==='accepted'&&<a className="btn btn-outline !py-2" href={`/bookings/${booking.id}/checkout`} data-testid={`link-checkout-${booking.id}`}>Payment unavailable</a>}{booking.status==='confirmed'&&new Date(booking.ends_at)<new Date()&&<button className="btn btn-outline !py-2" onClick={()=>completeMutation.mutate(booking.id)} disabled={completeMutation.isPending} data-testid={`button-complete-${booking.id}`}>Mark event complete</button>}<a className="btn btn-outline !py-2" href="/dashboard/messages">Open messages</a></div>{role==='host'&&booking.status==='completed'&&<BookingReview booking={booking} userId={userId}/>}</article>)}</div>;

  const sectionContent=()=>{
    if(section==='Bookings')return <div className="soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">Booking history</p></div>{renderBookings()}</div>;
    if(section==='Messages')return <div className="grid min-h-[470px] overflow-hidden rounded-2xl border border-[#e6e1d5] bg-[#fffdf8] md:grid-cols-[260px_1fr]"><aside className="border-b border-[#ece8dd] p-3 md:border-b-0 md:border-r"><p className="eyebrow p-3">Conversations</p>{conversationsQuery.isLoading?<p className="p-3 text-xs text-[#718078]">Loading…</p>:conversations.length?conversations.map(c=><button key={c.id} onClick={()=>setSelectedConversation(c.id)} className={`mb-1 w-full rounded-xl p-3 text-left text-sm font-bold ${currentConversation===c.id?'bg-[#e8eee6] text-[#315c4c]':'text-[#63756c] hover:bg-[#f1efe7]'}`} data-testid={`button-conversation-${c.id}`}>Event discussion<span className="mt-1 block text-xs font-normal text-[#849087]">{formatWhen(c.last_message_at)}</span></button>):<p className="p-3 text-sm text-[#718078]">A booking request creates a private conversation.</p>}</aside><section className="flex min-h-[420px] flex-col p-4 sm:p-5">{actionError&&<div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{errorMessage(actionError)}</div>}{!currentConversation?<div className="m-auto text-center text-sm text-[#718078]">Select a booking conversation to read or send messages.</div>:<><div className="flex-1 space-y-3 overflow-y-auto pb-4">{messagesQuery.isLoading?<p className="text-sm text-[#718078]">Loading messages…</p>:messagesQuery.isError?<p className="text-sm text-red-800">{errorMessage(messagesQuery.error)}</p>:messagesQuery.data?.length?messagesQuery.data.map(msg=><div key={msg.id} className={`max-w-[82%] rounded-2xl p-3 text-sm ${msg.sender_id===userId?'ml-auto bg-[#e8eee6] text-[#35584b]':'bg-[#f1efe7] text-[#5e6e65]'}`}><p className="whitespace-pre-wrap">{msg.body}</p><p className="mt-1 text-[10px] opacity-70">{formatWhen(msg.created_at)}{msg.sender_id!==userId&&!msg.read_at&&<button className="ml-2 font-bold underline" onClick={()=>readMessageMutation.mutate(msg.id)}>Mark read</button>}</p></div>):<p className="text-sm text-[#718078]">No messages yet. Start the conversation.</p>}</div><form className="flex gap-2 border-t border-[#ece8dd] pt-4" onSubmit={e=>{e.preventDefault();if(messageText.trim())sendMutation.mutate();}}><input className="field" value={messageText} onChange={e=>setMessageText(e.target.value)} maxLength={5000} placeholder="Write a message…" required data-testid="input-message"/><button className="btn btn-primary shrink-0 !px-4" type="submit" disabled={sendMutation.isPending||!messageText.trim()} data-testid="button-send-message">{sendMutation.isPending?'Sending…':'Send'}</button></form></>}</section></div>;
    if(section==='Notifications')return <div className="soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">Your updates</p></div>{notificationsQuery.isLoading?<p className="p-5 text-sm text-[#718078]">Loading notifications…</p>:notificationsQuery.isError?<p className="p-5 text-sm text-red-800">{errorMessage(notificationsQuery.error)}</p>:notifications.length?<div className="divide-y divide-[#ece8dd]">{notifications.map(n=><article key={n.id} className={`flex items-start justify-between gap-4 p-5 ${n.read_at?'':'bg-[#f8f7f0]'}`}><div><p className="font-bold text-[#35584b]">{n.title}</p><p className="mt-1 text-sm text-[#718078]">{n.body}</p><p className="mt-2 text-xs text-[#8a948e]">{formatWhen(n.created_at)}</p></div>{!n.read_at&&<button onClick={()=>readNotificationMutation.mutate(n.id)} className="shrink-0 text-xs font-bold text-[#42685a] underline underline-offset-4" data-testid={`button-read-${n.id}`}>Mark read</button>}</article>)}</div>:<Notice title="You’re all caught up" description="New booking and message updates will appear here." icon={<Sparkles size={22}/>} />}</div>;
    if(section==='Saved DJs')return favoritesQuery.isLoading?<ListingState loading error={null} emptyTitle="" emptyDescription=""/>:favoritesQuery.isError?<ListingState loading={false} error={favoritesQuery.error} emptyTitle="" emptyDescription=""/>:favoritesQuery.data?.length?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{favoritesQuery.data.map(dj=><DjCard key={dj.profile_id} dj={dj}/>)}</div>:<div className="soft-card"><Notice title="No saved DJs yet" description="Save DJs from their profile pages and they’ll be collected here." icon={<Heart size={22}/>} /><div className="-mt-7 pb-7 text-center"><a href="/djs" className="btn btn-primary">Browse DJs <ArrowRight size={15}/></a></div></div>;
    if(section==='Availability')return <div className="soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">DJ availability</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Open times and blocked dates</h2></div><form className="grid gap-3 border-b border-[#ece8dd] p-5 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={e=>{e.preventDefault();if(slotStart&&slotEnd&&new Date(slotEnd)>new Date(slotStart))saveSlotMutation.mutate();}}><label><span className="label">Starts</span><input type="datetime-local" className="field" value={slotStart} onChange={e=>setSlotStart(e.target.value)} required data-testid="input-availability-start"/></label><label><span className="label">Ends</span><input type="datetime-local" className="field" value={slotEnd} onChange={e=>setSlotEnd(e.target.value)} required data-testid="input-availability-end"/></label><label><span className="label">Status</span><select className="field" value={slotStatus} onChange={e=>setSlotStatus(e.target.value as 'available'|'blocked')} data-testid="select-availability-status"><option value="available">Available</option><option value="blocked">Blocked</option></select></label><button type="submit" className="btn btn-primary self-end" disabled={saveSlotMutation.isPending} data-testid="button-save-availability">Add time</button></form>{(saveSlotMutation.error||deleteSlotMutation.error)&&<p className="px-5 pt-3 text-sm text-red-800" role="alert">{errorMessage(saveSlotMutation.error||deleteSlotMutation.error)}</p>}{availabilityQuery.isLoading?<p className="p-5 text-sm text-[#718078]">Loading availability…</p>:availabilityQuery.isError?<p className="p-5 text-sm text-red-800">{errorMessage(availabilityQuery.error)}</p>:availabilityQuery.data?.length?<div className="divide-y divide-[#ece8dd]">{availabilityQuery.data.map(slot=><div key={slot.id} className="flex items-center justify-between gap-3 p-5"><div><p className="font-bold capitalize text-[#35584b]">{slot.status}</p><p className="mt-1 text-xs text-[#718078]">{formatWhen(slot.starts_at)} – {formatWhen(slot.ends_at)}</p></div><button className="text-xs font-bold text-[#8a5847] underline underline-offset-4" onClick={()=>deleteSlotMutation.mutate(slot.id)} disabled={deleteSlotMutation.isPending} data-testid={`button-remove-slot-${slot.id}`}>Remove</button></div>)}</div>:<Notice title="No availability set" description="Add an open date before hosts can request your time." icon={<Clock3 size={22}/>} />}</div>;
    if(section==='Earnings')return <div className="soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">Payments and payouts</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Earnings activity</h2></div><div className="border-b border-[#ece8dd] bg-[#fbf1e9] p-4 text-sm leading-6 text-[#795d4e]">Stripe Connect is not connected. No checkout, payment confirmation, refunds, or payouts can be processed yet.</div>{paymentsQuery.isLoading?<p className="p-5 text-sm text-[#718078]">Loading payment records…</p>:paymentsQuery.isError?<p className="p-5 text-sm text-red-800">{errorMessage(paymentsQuery.error)}</p>:paymentsQuery.data?.length?<div className="divide-y divide-[#ece8dd]">{paymentsQuery.data.map((payment:any)=><div key={payment.id} className="flex justify-between gap-4 p-5"><div><p className="font-bold text-[#35584b]">{payment.status}</p><p className="mt-1 text-xs text-[#718078]">{formatWhen(payment.created_at)}</p></div><p className="font-bold text-[#315c4c]">{new Intl.NumberFormat('en-GB',{style:'currency',currency:payment.currency}).format((payment.amount_minor??0)/100)}</p></div>)}</div>:<Notice title="No payment records" description="Records will appear only after a verified payment provider is configured and a real transaction is recorded." icon={<WalletCards size={22}/>} />}</div>;
    if(section==='Public profile')return <div className="soft-card p-6"><p className="eyebrow">DJ profile</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Your public listing</h2>{djSettingsQuery.isLoading?<p className="mt-4 text-sm text-[#718078]">Loading profile…</p>:djSettingsQuery.data?<><p className="mt-3 text-sm text-[#718078]">{djSettingsQuery.data.stage_name} · {djSettingsQuery.data.accepting_bookings?'Accepting requests':'Not accepting requests'}</p><a href="/onboarding/dj" className="btn btn-primary mt-5">Edit DJ profile <ArrowRight size={15}/></a></>:<><p className="mt-3 text-sm text-[#718078]">Complete your listing to appear in DJ search.</p><a href="/onboarding/dj" className="btn btn-primary mt-5">Build DJ profile <ArrowRight size={15}/></a></>}</div>;
    if(section==='Account')return <div className="soft-card p-6"><p className="eyebrow">Account settings</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Your details</h2>{settingsMessage&&<p className="mt-3 text-sm text-[#3c684f]" role="status">{settingsMessage}</p>}{saveAccountMutation.isError&&<p className="mt-3 text-sm text-red-800" role="alert">{errorMessage(saveAccountMutation.error)}</p>}<form className="mt-5 grid max-w-xl gap-4" onSubmit={e=>{e.preventDefault();saveAccountMutation.mutate();}}><label><span className="label">Display name</span><input className="field" value={settingsName} onChange={e=>setSettingsName(e.target.value)} required maxLength={80} data-testid="input-account-name"/></label><label><span className="label">City or region</span><input className="field" value={settingsCity} onChange={e=>setSettingsCity(e.target.value)} maxLength={120} data-testid="input-account-city"/></label><p className="text-xs text-[#829087]">Signed in as {auth.user?.email}</p><button className="btn btn-primary w-fit" type="submit" disabled={saveAccountMutation.isPending} data-testid="button-save-account">{saveAccountMutation.isPending?'Saving…':'Save details'}</button></form><button className="mt-6 text-sm font-bold text-[#8a5847] underline underline-offset-4" onClick={()=>void auth.signOut()} data-testid="button-account-sign-out">Log out</button></div>;
    return <><div className="grid gap-3 sm:grid-cols-3"><div className="soft-card p-4"><p className="eyebrow">Upcoming</p><p className="serif mt-2 text-3xl text-[#29483e]">{bookings.filter(b=>['accepted','payment_pending','confirmed'].includes(b.status)&&new Date(b.starts_at)>new Date()).length}</p><p className="mt-1 text-xs text-[#76827a]">Bookings</p></div><div className="soft-card p-4"><p className="eyebrow">Needs attention</p><p className="serif mt-2 text-3xl text-[#29483e]">{bookings.filter(b=>['pending','accepted','payment_pending'].includes(b.status)).length}</p><p className="mt-1 text-xs text-[#76827a]">Open requests</p></div><div className="soft-card p-4"><p className="eyebrow">Unread</p><p className="serif mt-2 text-3xl text-[#29483e]">{unreadCount}</p><p className="mt-1 text-xs text-[#76827a]">Notifications</p></div></div><div className="mt-5 soft-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#ece8dd] p-5"><div><p className="eyebrow">Your next steps</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Recent bookings</h2></div><a className="text-sm font-bold text-[#42685a]" href="/dashboard/bookings">All bookings <ArrowRight size={14} className="inline"/></a></div>{renderBookings()}</div><div className="mt-5 soft-card p-5"><p className="eyebrow">Conversations</p><p className="mt-2 text-sm text-[#718078]">{conversations.length?`${conversations.length} booking conversation${conversations.length===1?'':'s'} ready to open.`:'A private conversation is created automatically when a booking request is sent.'}</p><a href="/dashboard/messages" className="mt-3 inline-flex text-sm font-bold text-[#42685a]">Open messages <ArrowRight size={14} className="ml-1"/></a></div></>;
  };

  const initialLoading=bookingsQuery.isLoading||conversationsQuery.isLoading||notificationsQuery.isLoading;
  if(!auth.user)return <Layout><div className="mx-auto max-w-[850px] px-5 py-16"><div className="soft-card"><Notice title="Sign in to open your workspace" description="Your bookings, messages, and saved DJs are private to your account. Sign in to continue." icon={<LockKeyhole size={22}/>} /><div className="-mt-7 pb-7 text-center"><a href="/login" className="btn btn-primary">Sign in <ArrowRight size={15}/></a></div></div></div></Layout>;
  if(auth.loading)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-20 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#42685a] border-t-transparent"/><p className="mt-4 text-sm text-[#718078]">Loading your workspace…</p></div></Layout>;
  if(!role)return <Layout><div className="mx-auto max-w-[850px] px-5 py-16"><div className="soft-card"><Notice title="Your profile is still being prepared" description={auth.error||"Your account exists, but its marketplace profile is not ready yet. Refresh shortly or contact support if this continues."} icon={<Clock3 size={22}/>} /></div></div></Layout>;
  if(!hasSupabase)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><div className="soft-card"><Notice title="Your workspace is waiting" description="Connect Supabase (project URL and anon key), then apply the database migration to load account and booking data." icon={<AudioLines size={22}/>} /></div></div></Layout>;
  const initialError=bookingsQuery.error||conversationsQuery.error||notificationsQuery.error;
  if(initialError)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><div className="soft-card"><Notice title="We couldn’t load your workspace" description={errorMessage(initialError)} icon={<Disc3 size={22}/>} /></div></div></Layout>;
  return <Layout><div className="mx-auto max-w-[1280px] px-5 py-9 md:px-9 md:py-12">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{role==='dj'?'DJ workspace':'Your Encore'}</p><h1 className="serif mt-2 text-4xl font-semibold text-[#29483e]">{section}</h1><p className="mt-2 text-sm text-[#718078]">Your bookings, conversations, and account at a glance.</p></div>{role==='host'&&<a href="/djs" className="btn btn-primary w-fit">Find a DJ <ArrowRight size={15}/></a>}</div>
    {actionError&&section!=='Messages'&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{errorMessage(actionError)}</div>}
    <div className="grid gap-6 lg:grid-cols-[230px_1fr]"><aside className="soft-card h-fit p-3"><p className="eyebrow px-3 py-3">Workspace</p>{activeLinks.map(({href,label,icon:Icon})=><a key={href} href={href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition hover:bg-[#e8eee6] ${section===label?'bg-[#e8eee6] text-[#315c4c]':'text-[#63756c]'}`} data-testid={`link-dashboard-${label.toLowerCase().replaceAll(' ','-')}`}><Icon size={17}/>{label}{label==='Notifications'&&unreadCount>0&&<span className="ml-auto rounded-full bg-[#e7b39a] px-2 py-0.5 text-[10px] text-[#513b31]">{unreadCount}</span>}</a>)}</aside><div className="min-h-[430px]">{initialLoading?<div className="animate-pulse space-y-4"><div className="h-24 rounded-2xl bg-[#e8eee6]"/><div className="h-64 rounded-2xl bg-[#f1efe7]"/></div>:sectionContent()}</div></div>
  </div></Layout>;
}

function Admin() {
  const auth=useAuth();
  const queryClient=useQueryClient();
  const enabled=hasSupabase&&auth.role==='admin';
  const users=useQuery({queryKey:['admin','profiles'],queryFn:listAdminProfiles,enabled});
  const bookings=useQuery({queryKey:['admin','bookings'],queryFn:listAdminBookings,enabled});
  const djs=useQuery({queryKey:['admin','djs'],queryFn:listAdminDjs,enabled});
  const payments=useQuery({queryKey:['admin','payments'],queryFn:()=>listMyPayments(auth.user!.id,'admin'),enabled});
  const settings=useQuery({queryKey:['admin','settings'],queryFn:getPlatformSettings,enabled});
  const [commission,setCommission]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(settings.data?.commission_basis_points!==undefined&&settings.data?.commission_basis_points!==null)setCommission(String(settings.data.commission_basis_points/100));},[settings.data?.commission_basis_points]);
  const saveCommission=useMutation({mutationFn:()=>savePlatformCommission(Math.round(Number(commission)*100)),onSuccess:(row)=>{setNotice(`Commission saved at ${(row.commission_basis_points/100).toFixed(2)}%.`);void queryClient.invalidateQueries({queryKey:['admin','settings']});}});
  const verificationMutation=useMutation({mutationFn:({djId,status}:{djId:string;status:'unverified'|'pending'|'verified'|'rejected'})=>setDjVerification(djId,status),onSuccess:()=>{void queryClient.invalidateQueries({queryKey:['admin','djs']});void queryClient.invalidateQueries({queryKey:['public-djs']});void queryClient.invalidateQueries({queryKey:['dj-profile']});}});
  if(!hasSupabase)return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><div className="soft-card"><Notice title="Admin data is unavailable" description="Connect Supabase and apply the database migration before loading admin records." icon={<ShieldCheck size={22}/>} /></div></div></Layout>;
  if(auth.loading)return <Layout><div className="mx-auto py-20 text-center text-sm text-[#718078]">Checking admin access…</div></Layout>;
  if(auth.role!=='admin')return <Layout><div className="mx-auto max-w-[1000px] px-5 py-12 md:px-9"><div className="soft-card"><Notice title={auth.user?'Admin access is restricted':'Sign in to continue'} description="Administrator access is enforced using the Supabase app_metadata role claim and database row-level security. This page does not grant permissions." icon={<LockKeyhole size={22}/>} /></div></div></Layout>;
  const error=users.error||bookings.error||djs.error||payments.error||settings.error||saveCommission.error||verificationMutation.error;
  return <Layout><div className="mx-auto max-w-[1200px] px-5 py-12 md:px-9"><div className="mb-6 flex items-center gap-3"><ShieldCheck className="text-[#42685a]"/><p className="eyebrow">Restricted area</p></div><h1 className="serif text-4xl font-semibold text-[#29483e]">Admin console</h1><p className="mt-2 text-sm text-[#718078]">Administrative records are protected by Supabase authorization rules.</p>
    {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{errorMessage(error)}</div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><div className="soft-card p-5"><p className="eyebrow">Accounts</p><p className="serif mt-2 text-3xl text-[#29483e]">{users.data?.length??'—'}</p></div><div className="soft-card p-5"><p className="eyebrow">Bookings</p><p className="serif mt-2 text-3xl text-[#29483e]">{bookings.data?.length??'—'}</p></div><div className="soft-card p-5"><p className="eyebrow">Payment records</p><p className="serif mt-2 text-3xl text-[#29483e]">{payments.data?.length??'—'}</p><p className="mt-1 text-xs text-[#829087]">Revenue unavailable until Stripe is connected</p></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="soft-card p-5"><p className="eyebrow">Platform settings</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Commission</h2><p className="mt-2 text-sm leading-6 text-[#718078]">The rate is stored centrally in basis points. No charge is calculated until Stripe Connect is configured.</p>{notice&&<p className="mt-3 text-sm text-[#3c684f]" role="status">{notice}</p>}<form className="mt-4 flex items-end gap-3" onSubmit={e=>{e.preventDefault();if(Number(commission)>=0&&Number(commission)<=100)saveCommission.mutate();}}><label className="flex-1"><span className="label">Commission percentage</span><input className="field" type="number" min="0" max="100" step="0.01" value={commission} onChange={e=>setCommission(e.target.value)} required data-testid="input-commission"/></label><button className="btn btn-primary" type="submit" disabled={saveCommission.isPending} data-testid="button-save-commission">{saveCommission.isPending?'Saving…':'Save'}</button></form>{settings.isLoading&&<p className="mt-2 text-xs text-[#718078]">Loading current setting…</p>}</section>
      <section className="soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">Accounts</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Recent users</h2></div>{users.isLoading?<p className="p-5 text-sm text-[#718078]">Loading users…</p>:users.data?.length?<div className="max-h-[400px] divide-y divide-[#ece8dd] overflow-y-auto">{users.data.map(user=><div key={user.id} className="flex justify-between gap-3 p-4 text-sm" data-testid={`admin-user-${user.id}`}><div><p className="font-bold text-[#35584b]">{user.display_name||'Unnamed account'}</p><p className="mt-1 text-xs text-[#718078]">{user.city||'Location not set'}</p></div><span className="rounded-full bg-[#e8eee6] px-3 py-1 text-xs font-bold capitalize text-[#42685a]">{user.role}</span></div>)}</div>:<Notice title="No users to show" description="New accounts will appear here." icon={<Disc3 size={22}/>} />}</section></div>
    <section className="mt-5 soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">DJ review</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Verification queue</h2><p className="mt-1 text-xs text-[#718078]">Only verified, active DJs appear in public search.</p></div>{djs.isLoading?<p className="p-5 text-sm text-[#718078]">Loading DJ profiles…</p>:djs.data?.length?<div className="divide-y divide-[#ece8dd]">{djs.data.map(dj=><div key={dj.profile_id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-bold text-[#35584b]">{dj.stage_name}</p><p className="mt-1 text-xs capitalize text-[#718078]">{dj.verification_status} · {dj.is_active?'Active':'Inactive'}</p></div><label className="w-full max-w-52"><span className="sr-only">Verification status for {dj.stage_name}</span><select className="field" value={dj.verification_status} disabled={verificationMutation.isPending} onChange={e=>verificationMutation.mutate({djId:dj.profile_id,status:e.target.value as 'unverified'|'pending'|'verified'|'rejected'})} data-testid={`select-dj-verification-${dj.profile_id}`}><option value="unverified">Unverified</option><option value="pending">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label></div>)}</div>:<Notice title="No DJ profiles yet" description="DJ profiles will appear here after onboarding." icon={<Headphones size={22}/>} />}</section>
    <section className="mt-5 soft-card overflow-hidden"><div className="border-b border-[#ece8dd] p-5"><p className="eyebrow">Booking oversight</p><h2 className="serif mt-1 text-2xl text-[#29483e]">Recent bookings</h2></div>{bookings.isLoading?<p className="p-5 text-sm text-[#718078]">Loading bookings…</p>:bookings.data?.length?<div className="divide-y divide-[#ece8dd]">{bookings.data.map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span className="font-bold text-[#35584b]">{b.event_type} · {b.venue}</span><span className="text-xs capitalize text-[#718078]">{b.status.replaceAll('_',' ')} · {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(b.created_at))}</span></div>)}</div>:<Notice title="No booking activity yet" description="Booking records will appear as hosts submit requests." icon={<CalendarDays size={22}/>} />}</section>
  </div></Layout>;
}

const legalCopy:Record<string,{title:string;intro:string;sections:string[]}> = {
  '/terms':{title:'Terms of service',intro:'These terms explain the basics of using Encore to discover and connect with DJs.',sections:['Using Encore','Bookings and conversations','Payments and fees','Your account and content','Contact and updates']},
  '/privacy':{title:'Privacy',intro:'We believe trust starts with knowing what happens to your information.',sections:['Information you provide','How information is used','Visibility and sharing','Security and retention','Your choices']},
  '/cancellation-policy':{title:'Cancellation policy',intro:'Plans can change. Agree on cancellation terms directly in your booking before confirming.',sections:['Before a booking is confirmed','If plans change','Refunds and payment status','Getting help']},
};
function Legal({path}:{path:string}) {
  const doc=legalCopy[path]||legalCopy['/terms'];
  return <Layout><article className="mx-auto max-w-[780px] px-5 py-14 md:px-9"><p className="eyebrow">Encore / Information</p><h1 className="serif mt-3 text-5xl font-semibold text-[#29483e]">{doc.title}</h1><p className="mt-5 text-lg leading-7 text-[#718078]">{doc.intro}</p><div className="mt-10 rounded-2xl border border-[#e6e1d5] bg-[#f1efe7] p-5 text-sm leading-6 text-[#6d796f]">This page is a product placeholder, not legal advice. Final policy terms should be reviewed and published before launch. Payment handling remains unavailable until Stripe is connected.</div><div className="mt-9 space-y-8">{doc.sections.map((s,i)=><section key={s}><h2 className="serif text-2xl text-[#315247]">{s}</h2><p className="mt-2 text-sm leading-7 text-[#718078]">Encore is designed to make event planning and DJ booking easier to understand. Relevant details, expectations, and responsibilities should be clearly agreed between participants. This section will be completed with the final service policy.</p></section>)}</div></article></Layout>;
}

function NotFound() {
  return <Layout><div className="mx-auto flex min-h-[62vh] max-w-3xl flex-col items-center justify-center px-5 text-center"><p className="eyebrow">404 / Off the setlist</p><h1 className="serif mt-4 text-6xl font-semibold tracking-tight text-[#29483e]">That page missed a beat.</h1><p className="mt-4 max-w-md text-sm leading-6 text-[#718078]">The link may have moved, or this page may not exist. Let’s get you back to the good stuff.</p><a href="/" className="btn btn-primary mt-7"><ArrowLeft size={15}/>Back to Encore</a></div></Layout>;
}

function StartupSplash({exiting=false}:{exiting?:boolean}) {
  return <main className={`splash-screen fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#f8f6ef] transition-opacity duration-[480ms] ${exiting?'pointer-events-none opacity-0':'opacity-100'}`} aria-label="Loading Encore">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(206,221,202,.62),transparent_38%),radial-gradient(ellipse_at_18%_85%,rgba(231,124,90,.12),transparent_34%)]"/>
    <div className="splash-orbit absolute left-1/2 top-1/2 h-[min(76vw,34rem)] w-[min(76vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b7c9b6]/40">
      <span className="splash-orbit-dot"/>
    </div>
    <div className="splash-orbit splash-orbit-reverse absolute left-1/2 top-1/2 h-[min(60vw,27rem)] w-[min(60vw,27rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#d3b7a5]/55">
      <span className="splash-orbit-dot splash-orbit-dot-soft"/>
    </div>
    <div className="relative flex flex-col items-center text-center" role="status">
      <div className="splash-mark relative grid h-[86px] w-[86px] place-items-center rounded-[28px] bg-[#285a4d] text-[#f8f6ef] shadow-[0_18px_55px_rgba(40,90,77,.25)]">
        <div className="splash-halo absolute -inset-3 rounded-[34px] border border-[#739581]/45"/>
        <AudioLines size={35} strokeWidth={1.8}/>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#e77c5a] ring-4 ring-[#f8f6ef]"/>
      </div>
      <p className="splash-wordmark mt-7 text-[2.65rem] font-extrabold tracking-[-.09em] text-[#23473c]">encore<span className="text-[#e77c5a]">.</span></p>
      <p className="splash-caption mt-1 text-[11px] font-bold uppercase tracking-[.24em] text-[#718078]">Find your sound</p>
      <div className="mt-7 flex h-7 items-end gap-[5px]" aria-hidden="true">{[12,22,16,28,18,25,13,21,10].map((height,index)=><span key={index} className="splash-bar w-[3px] rounded-full bg-[#e17b59]" style={{height,animationDelay:`${index*80}ms`}}/>)}</div>
      <p className="mt-3 text-xs text-[#88938b]">Setting the scene…</p>
    </div>
  </main>;
}

function Router() {
  const auth=useAuth();
  const [splashVisible,setSplashVisible]=useState(true);
  const [splashExiting,setSplashExiting]=useState(false);
  useEffect(()=>{
    if(auth.loading)return;
    setSplashExiting(false);
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitTimer=window.setTimeout(()=>setSplashExiting(true),reducedMotion?350:1500);
    const hideTimer=window.setTimeout(()=>setSplashVisible(false),reducedMotion?500:2000);
    return ()=>{window.clearTimeout(exitTimer);window.clearTimeout(hideTimer);};
  },[auth.loading]);
  return <RoutedErrorBoundary>
    {!auth.loading&&<Switch>
    <Route path="/" component={Home}/>
    <Route path="/djs" component={Browse}/>
    <Route path="/djs/:id" component={DJProfile}/>
    <Route path="/book/:id" component={BookingRequest}/>
    <Route path="/bookings/:id/checkout" component={Checkout}/>
    <Route path="/booking-confirmed/:id" component={Confirmed}/>
    <Route path="/login" component={()=><AuthPage/>}/>
    <Route path="/signup" component={()=><AuthPage signup/>}/>
    <Route path="/reset-password" component={ResetPassword}/>
    <Route path="/onboarding/host" component={()=><Onboarding/>}/>
    <Route path="/onboarding/dj" component={()=><Onboarding dj/>}/>
    <Route path="/dashboard" component={()=><Dashboard/>}/>
    <Route path="/dashboard/bookings" component={()=><Dashboard section="Bookings"/>}/>
    <Route path="/dashboard/messages" component={()=><Dashboard section="Messages"/>}/>
    <Route path="/dashboard/notifications" component={()=><Dashboard section="Notifications"/>}/>
    <Route path="/dashboard/favorites" component={()=><Dashboard section="Saved DJs"/>}/>
    <Route path="/dashboard/availability" component={()=><Dashboard section="Availability"/>}/>
    <Route path="/dashboard/earnings" component={()=><Dashboard section="Earnings"/>}/>
    <Route path="/dashboard/profile" component={()=><Dashboard section="Public profile"/>}/>
    <Route path="/dashboard/account" component={()=><Dashboard section="Account"/>}/>
    <Route path="/admin" component={Admin}/>
    <Route path="/terms" component={()=><Legal path="/terms"/>}/>
    <Route path="/privacy" component={()=><Legal path="/privacy"/>}/>
    <Route path="/cancellation-policy" component={()=><Legal path="/cancellation-policy"/>}/>
    <Route component={NotFound}/>
  </Switch>}
  {(auth.loading||splashVisible)&&<StartupSplash exiting={splashExiting&&!auth.loading}/>}
  </RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AuthProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></AuthProvider></TooltipProvider></QueryClientProvider>;
}

export default App;
