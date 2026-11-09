"use client";

import React, { useState, useEffect } from "react";
import { MovieResult, BookmarkedMovie } from "@/lib/types";
import { storage } from "@/lib/storage";
import {
  FaStar,
  FaBookmark,
  FaRegBookmark,
  FaPlay,
  FaCheck,
  FaTriangleExclamation,
  FaQuestion,
} from "react-icons/fa6";

interface MovieCardProps {
  movie?: MovieResult;
}

export default function MovieRecommendationCard({ movie }: MovieCardProps) {
  const title = movie?.title || "";
  const year = movie?.year ? String(movie.year) : "";
  const identifier = movie?.movie_id || title || "unknown-movie";

  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!identifier || identifier === "unknown-movie") return;
    setBookmarked(storage.isBookmarked(identifier));
  }, [identifier]);

  if (!movie || !title) {
    return null;
  }

  const handleToggleBookmark = () => {
    if (bookmarked) {
      storage.removeBookmark(identifier);
      setBookmarked(false);
    } else {
      const item: BookmarkedMovie = {
        movie_id: identifier,
        title: title,
        year: movie?.year || 2024,
        rating: movie?.rating || 7.5,
        genres: movie?.genres || [],
        overview: movie?.overview || "",
        warnings: movie?.warnings || [],
        savedAt: new Date().toISOString(),
        status: "unwatched",
      };
      storage.saveBookmark(item);
      setBookmarked(true);
    }
  };

  const trailerSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${title} ${year} trailer`
  )}`;

  // Deduplicate all warning tags and unknown topics
  const seenTopics = new Set<string>();
  const deduplicatedBadges: Array<{
    key: string;
    name: string;
    status: "present" | "absent" | "unknown";
    present_via?: string[];
  }> = [];

  for (const w of movie?.warnings || []) {
    const normalized = (w?.topic_name || "").toLowerCase().trim();
    if (normalized && !seenTopics.has(normalized)) {
      seenTopics.add(normalized);
      deduplicatedBadges.push({
        key: `w-${w.topic_id || normalized}`,
        name: w.topic_name,
        status: w.status,
        present_via: w.present_via,
      });
    }
  }

  for (const u of movie?.unknown_topics || []) {
    const normalized = (u || "").toLowerCase().trim();
    if (normalized && !seenTopics.has(normalized)) {
      seenTopics.add(normalized);
      deduplicatedBadges.push({
        key: `u-${normalized}`,
        name: u,
        status: "unknown",
      });
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#e4e9f5] shadow-xs hover:shadow-md transition flex flex-col gap-3">
      {/* Header: Title, Year, Genres, Rating */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[#1f2041] truncate">
            {title} {year ? `(${year})` : ""}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
            {(movie?.genres || []).map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#2a14b4] font-medium"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm font-bold text-[#1f2041] bg-[#fbf9eb] px-2.5 py-1 rounded-full border border-[#f2e7b8] shrink-0">
          <FaStar className="text-amber-500 text-xs" />
          {movie?.rating ? movie.rating.toFixed(1) : "N/A"}
        </div>
      </div>

      {/* Movie Overview / Description */}
      {movie?.overview && (
        <div className="p-3 rounded-xl bg-[#f8faff] border border-[#eef2fc] text-xs text-[#45475e] leading-relaxed">
          {movie.overview}
        </div>
      )}

      {/* Safety Badges */}
      <div className="flex flex-wrap gap-2">
        {deduplicatedBadges.length > 0 ? (
          deduplicatedBadges.map((badge) => {
            if (badge.status === "absent") {
              return (
                <span
                  key={badge.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e6f8ee] text-[#0d8744] border border-[#b2e8c6]"
                >
                  <FaCheck className="text-[10px]" />
                  No {badge.name}
                </span>
              );
            }
            if (badge.status === "present") {
              return (
                <span
                  key={badge.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fff3e0] text-[#c25e00] border border-[#ffd599]"
                >
                  <FaTriangleExclamation className="text-[10px] text-[#e65100]" />
                  Contains {badge.name}
                  {badge.present_via && badge.present_via.length > 0 && (
                    <span> ({badge.present_via.join(", ")})</span>
                  )}
                </span>
              );
            }
            return (
              <span
                key={badge.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f0f2f5] text-[#65676b] border border-[#dcdfe4]"
              >
                <FaQuestion className="text-[10px]" />
                No data ({badge.name})
              </span>
            );
          })
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#e6f8ee] text-[#0d8744] border border-[#b2e8c6]">
            <FaCheck className="text-[10px]" /> Verified Safe
          </span>
        )}
      </div>

      {/* Match Reasons */}
      {movie?.match_reasons && movie.match_reasons.length > 0 && (
        <div className="text-[11px] text-[#6b6d85]">
          Reason: {movie.match_reasons.join(", ")}
        </div>
      )}

      {/* Action Footer: Trailer & Bookmark */}
      <div className="pt-3 border-t border-[#edf1f8] flex items-center justify-between text-xs">
        <a
          href={trailerSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[#2a14b4] font-medium hover:underline cursor-pointer"
        >
          <FaPlay className="text-[10px]" />
          Trailer
        </a>

        <button
          onClick={handleToggleBookmark}
          className={`flex items-center gap-1.5 font-medium transition cursor-pointer px-3 py-1.5 rounded-lg border ${
            bookmarked
              ? "bg-[#eff4ff] text-[#2a14b4] border-[#ccd8f7]"
              : "text-[#555770] border-[#e2e6f0] hover:bg-[#f6f8fd]"
          }`}
        >
          {bookmarked ? (
            <>
              <FaBookmark className="text-[#2a14b4]" /> Bookmarked
            </>
          ) : (
            <>
              <FaRegBookmark /> Bookmark
            </>
          )}
        </button>
      </div>
    </div>
  );
}
