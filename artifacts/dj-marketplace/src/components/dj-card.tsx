import { ArrowUpRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import type { PublicDj } from '@/lib/marketplace';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function DjCard({ dj }: { dj: PublicDj }) {
  return (
    <article
      className="group overflow-hidden rounded-2xl border border-[#e6e1d5] bg-[#fffdf8] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(38,68,55,.11)]"
      data-testid={`card-dj-${dj.profile_id}`}
    >
      <a href={`/djs/${dj.profile_id}`} className="block">
        <div className="relative aspect-[1.28/1] overflow-hidden bg-[#e8eee6]">
          {dj.avatar_url ? (
            <img
              src={dj.avatar_url}
              alt={`${dj.stage_name} profile`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_72%_28%,#adc4b0_0,transparent_30%),linear-gradient(140deg,#e8eee6,#dbe4d9)]">
              <span className="serif text-7xl font-semibold text-[#42685a]/65">
                {dj.stage_name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#14261f]/75 via-[#14261f]/25 to-transparent p-4 pt-16">
            <div className="flex flex-wrap gap-1.5">
              {dj.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur"
                >
                  {genre}
                </span>
              ))}
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fffdf8] text-[#315c4c] transition group-hover:bg-[#e4a181] group-hover:text-white">
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="serif truncate text-[1.35rem] font-semibold text-[#29483e]">
                  {dj.stage_name}
                </h3>
                {dj.verification_status === 'verified' && (
                  <BadgeCheck
                    size={16}
                    className="shrink-0 text-[#4c7b66]"
                    aria-label="Verified DJ"
                  />
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#718078]">
                <MapPin size={13} />
                {dj.city || 'Location not set'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-extrabold text-[#315c4c]">
                {money(dj.hourly_rate_minor, dj.currency)}
              </p>
              <p className="text-[10px] text-[#829087]">per hour</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#708078]">
            {dj.bio || 'This DJ is still adding their introduction.'}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-[#ece8dd] pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#785f39]">
              <Star size={13} className="fill-[#d8a957] text-[#d8a957]" />
              {dj.review_count ? `${Number(dj.rating).toFixed(1)} (${dj.review_count})` : 'New profile'}
            </span>
            <span className="text-[#7b8980]">
              {dj.experience_years} {dj.experience_years === 1 ? 'year' : 'years'} experience
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}
