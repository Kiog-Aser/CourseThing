import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "./ui";

/**
 * Poster-style card to showcase a course like a "series/movie" tile.
 *
 * This is a FRONTEND-ONLY mock. It gracefully handles absence of new DB fields
 * (coverImageUrl, tagline, accentColor) by falling back to generated gradients,
 * the existing description, or neutral styling.
 *
 * Usage:
 * <CoursePosterCard
 *   slug={course.slug}
 *   title={course.title}
 *   language={course.language}
 *   description={course.description}
 *   // Optional future fields (ignored if missing):
 *   coverImageUrl={(course as any).coverImageUrl}
 *   tagline={(course as any).tagline}
 *   accentColor={(course as any).accentColor}
 * />
 */

export interface CoursePosterCardProps {
  slug: string;
  title: string;
  language: string;
  description?: string | null;
  // Forward-compatible optional props (not yet backed by DB)
  tagline?: string | null;
  coverImageUrl?: string | null;
  accentColor?: string | null;
  className?: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  english: "🇬🇧",
  spanish: "🇪🇸",
  french: "🇫🇷",
  german: "🇩🇪",
  italian: "🇮🇹",
  portuguese: "🇵🇹",
  chinese: "🇨🇳",
  japanese: "🇯🇵",
  korean: "🇰🇷",
  arabic: "🇦🇪",
  russian: "🇷🇺",
  dutch: "🇳🇱",
  swedish: "🇸🇪",
  norwegian: "🇳🇴",
  danish: "🇩🇰",
  finnish: "🇫🇮",
  polish: "🇵🇱",
  turkish: "🇹🇷",
  hindi: "🇮🇳",
  general: "🌐",
};

function languageFlag(language: string) {
  const key = language?.trim().toLowerCase();
  return LANGUAGE_FLAGS[key] ?? "🌐";
}

/**
 * Deterministic fallback gradient generator so each course without artwork
 * still looks distinct. Uses a small palette and hashes the slug.
 */
function fallbackGradient(slug: string) {
  const palettes = [
    ["#1e3a8a", "#9333ea", "#f472b6"], // indigo -> purple -> pink
    ["#065f46", "#059669", "#10b981"], // emerald spectrum
    ["#7c2d12", "#ea580c", "#fbbf24"], // warm orange/gold
    ["#312e81", "#2563eb", "#06b6d4"], // indigo -> blue -> cyan
    ["#581c87", "#9333ea", "#c084fc"], // deep purple
    ["#064e3b", "#047857", "#34d399"], // green teal
  ];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const [c1, c2, c3] = palettes[hash % palettes.length] ?? [
    "#1e3a8a",
    "#9333ea",
    "#f472b6",
  ];
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`;
}

export function CoursePosterCard(props: CoursePosterCardProps) {
  const {
    slug,
    title,
    language,
    description,
    tagline,
    coverImageUrl,
    accentColor,
    className,
  } = props;

  const flag = languageFlag(language);
  const isRedundantLanguage =
    title?.trim().toLowerCase() === language?.trim().toLowerCase();
  const shortDescription =
    tagline ??
    description ??
    "Immerse yourself in engaging lessons crafted to build real fluency.";

  const accent = accentColor ?? "#6366f1";
  const gradientStyle: React.CSSProperties = !coverImageUrl
    ? {
        backgroundImage: fallbackGradient(slug),
      }
    : {};

  return (
    <Link
      href={`/learn?course=${encodeURIComponent(slug)}`}
      className={cn(
        "group focus-visible:ring-primary relative block w-[180px] shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      style={
        {
          "--accent": accent,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "relative aspect-[9/16] overflow-hidden rounded-xl",
          "",
          "bg-neutral-900 text-white",
          "shadow-[0_4px_14px_-4px_rgba(0,0,0,0.5)]",
          "transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_10px_30px_-6px_rgba(0,0,0,0.55)]",
        )}
        style={gradientStyle}
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="180px"
            priority={false}
            className="object-cover"
          />
        )}

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5" />

        {/* Language badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className="rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            {flag}
            {!isRedundantLanguage && (
              <span className="ml-1">
                {language.charAt(0).toUpperCase() + language.slice(1)}
              </span>
            )}
          </span>
        </div>

        {/* Content */}
        <div className="absolute inset-x-3 bottom-3 space-y-1">
          <h3 className="line-clamp-2 text-base leading-snug font-bold drop-shadow">
            {title}
          </h3>
          <p className="line-clamp-2 text-[11px] leading-tight text-white/70">
            {shortDescription}
          </p>
          <div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
              Start <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default CoursePosterCard;
