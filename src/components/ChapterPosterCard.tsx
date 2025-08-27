import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "./ui";

export interface ChapterPosterCardProps {
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
  lessonCount?: number;
}

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

export function ChapterPosterCard(props: ChapterPosterCardProps) {
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
    lessonCount,
  } = props;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation behavior
      router.push(slug);
    }
  };

  const cardContent = (
    <div
      className={cn(
        "group focus-visible:ring-primary relative block w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-lg mx-auto w-[170px] sm:w-[200px]",
          "bg-neutral-900 text-white",
          "shadow-lg shadow-black/20",
          "ring-1 ring-white/10",
          "transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/30 group-hover:ring-white/20",
        )}
        style={
          !coverImageUrl
            ? {
                backgroundImage: fallbackGradient(slug),
              }
            : {}
        }
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 170px, 200px"
            unoptimized
            priority={false}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* Subtle overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Content for chapters */}
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <h3 className="line-clamp-2 text-lg leading-tight font-bold text-white drop-shadow-lg">
            {title}
          </h3>
          <p className="line-clamp-2 text-sm leading-tight text-white/80">
            {description || tagline}
          </p>
          {lessonCount !== undefined && lessonCount > 0 && (
            <div className="text-xs text-white/70 font-medium">
              {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
            </div>
          )}
          <div className="opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              Start Chapter <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return cardContent;
}

export default ChapterPosterCard;
