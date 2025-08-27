import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
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
  onClick?: () => void;
  chapterCount?: number;
  lessonCount?: number;
  ctaLabel?: string | null;
  isFree?: boolean;
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
  const router = useRouter();
  const {
    slug,
    title,
    language,
    description,
    tagline,
    coverImageUrl,
    accentColor,
    className,
    onClick,
    chapterCount,
    lessonCount,
    isFree,
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

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation behavior
      router.push(`/learn?course=${encodeURIComponent(slug)}`);
    }
  };

  const cardContent = (
    <div
              className={cn(
          "group focus-visible:ring-primary relative block w-full sm:w-[200px] shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "cursor-pointer",
          className,
        )}
      style={
        {
          "--accent": accent,
        } as React.CSSProperties
      }
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-lg",
          "bg-neutral-900 text-white",
          "shadow-lg shadow-black/20",
          "ring-1 ring-white/10",
          "transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/30 group-hover:ring-white/20",
        )}
        style={gradientStyle}
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="200px"
            priority={false}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Log the error for debugging
              console.log('Image failed to load:', coverImageUrl, e);
              // Hide the image on error to show the fallback gradient
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Free badge */}
        {isFree && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              Free
            </span>
          </div>
        )}

        {/* Hover button for course posters */}
        <div className="absolute inset-x-4 bottom-4 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
            {props.ctaLabel ?? "Start Course"} <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );

  return cardContent;
}

export default CoursePosterCard;
