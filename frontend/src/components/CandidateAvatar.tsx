"use client";
import { useEffect, useState } from "react";

/**
 * A candidate's photo, with a silhouette to fall back on.
 *
 * The affidavit photos are hotlinked from myneta and a good number of the URLs
 * are dead. Rendering a bare <img> means those come out as the browser's broken
 * image icon — a torn page glyph and the alt text — which is what the Overview
 * dossier and the Election Tracker were showing. Only an absent url was being
 * handled; a url that exists but fails to load was not.
 *
 * Catching onError covers both cases, and the placeholder is tinted with the
 * candidate's party colour so a column of them still reads as data rather than
 * as breakage.
 */

const SIZES = {
  // Keyed by the box's Tailwind width so a call site says what it renders.
  "7": { box: "w-7 h-7 rounded-lg", icon: "w-4 h-4" },
  "8": { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  "9": { box: "w-9 h-9 rounded-xl", icon: "w-5 h-5" },
  "10": { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5" },
  "20": { box: "w-20 h-20 rounded-2xl", icon: "w-11 h-11" },
} as const;

export type CandidateAvatarSize = keyof typeof SIZES;

export default function CandidateAvatar({
  url,
  name,
  color,
  size = "9",
  elevated = false,
}: {
  url?: string | null;
  name: string;
  color?: string | null;
  size?: CandidateAvatarSize;
  elevated?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const { box, icon } = SIZES[size];
  const accent = color || "#4F46E5";

  // A list row is reused as the user scrolls or refilters, so the same element
  // can be handed a different candidate's url. Without this the failure of one
  // photo would stick and suppress the next candidate's perfectly good one.
  useEffect(() => setErrored(false), [url]);

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={name}
        className={`${box} object-cover shrink-0${elevated ? " border-2 border-white shadow-md" : ""}`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={`${box} flex items-center justify-center shrink-0${elevated ? " shadow-md" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${accent}22, ${accent}44)`,
        border: `1px solid ${accent}33`,
      }}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4.5" fill={accent} opacity="0.7" />
        <path d="M3 21c0-4.4 4-8 9-8s9 3.6 9 8" fill={accent} opacity="0.4" />
      </svg>
    </div>
  );
}
