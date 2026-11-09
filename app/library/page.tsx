"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookmarkedMovie } from "@/lib/types";
import { storage } from "@/lib/storage";
import {
  FaBookmark,
  FaCheck,
  FaStar,
  FaTrashCan,
  FaPlay,
  FaArrowRight,
  FaMagnifyingGlass,
  FaComments,
} from "react-icons/fa6";

export default function LibraryPage() {
  const [activeProfileName, setActiveProfileName] = useState("Alex");
  const [bookmarks, setBookmarks] = useState<BookmarkedMovie[]>([]);
  const [filter, setFilter] = useState<"all" | "unwatched" | "watched">("all");
  const [search, setSearch] = useState("");

  const loadProfileBookmarks = () => {
    const user = storage.getUser();
    setActiveProfileName(user.name || "Alex");
    setBookmarks(storage.getBookmarks());
  };

  useEffect(() => {
    loadProfileBookmarks();

    // Re-render immediately when profile changes
    window.addEventListener("cinesafe_profile_switched", loadProfileBookmarks);
    return () => {
      window.removeEventListener("cinesafe_profile_switched", loadProfileBookmarks);
    };
  }, []);

  const handleToggleWatch = (movieId: string) => {
    storage.toggleWatchStatus(movieId);
    setBookmarks(storage.getBookmarks());
  };

  const handleRemove = (movieId: string) => {
    storage.removeBookmark(movieId);
    setBookmarks(storage.getBookmarks());
  };

  const handleRate = (movieId: string, rating: number) => {
    storage.updateRating(movieId, rating);
    setBookmarks(storage.getBookmarks());
  };

  const totalCount = bookmarks.length;
  const unwatchedCount = bookmarks.filter((b) => b.status === "unwatched").length;
  const watchedCount = bookmarks.filter((b) => b.status === "watched").length;

  const filtered = bookmarks.filter((item) => {
    if (filter === "unwatched" && item.status !== "unwatched") return false;
    if (filter === "watched" && item.status !== "watched") return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e4e9f5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2a14b4] tracking-wider uppercase">
                Personal Collection & Watchlist
              </span>
              <span className="text-xs text-gray-500 bg-[#eff4ff] px-2.5 py-0.5 rounded-full font-semibold">
                Profile: {activeProfileName}
              </span>
            </div>
            <h1 className="text-3xl font-black text-[#1a1c38] mt-1">
              {activeProfileName}&apos;s Movie Library
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
              All the films bookmarked for {activeProfileName}. Keep track of what you have watched, rate your experience, and stay protected from phobias.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#eff4ff] border border-[#d6e3fb] p-3.5 rounded-2xl text-center min-w-20">
              <span className="text-2xl font-black text-[#2a14b4]">{totalCount}</span>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Saved</p>
            </div>
            <div className="bg-[#fffbeb] border border-[#fef08a] p-3.5 rounded-2xl text-center min-w-20">
              <span className="text-2xl font-black text-amber-600">{unwatchedCount}</span>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Unwatched</p>
            </div>
            <div className="bg-[#e8f7ee] border border-[#b8ecd0] p-3.5 rounded-2xl text-center min-w-20">
              <span className="text-2xl font-black text-emerald-700">{watchedCount}</span>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Watched</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                filter === "all"
                  ? "bg-[#2a14b4] text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Movies ({totalCount})
            </button>
            <button
              onClick={() => setFilter("unwatched")}
              className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                filter === "unwatched"
                  ? "bg-[#2a14b4] text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Unwatched ({unwatchedCount})
            </button>
            <button
              onClick={() => setFilter("watched")}
              className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                filter === "watched"
                  ? "bg-[#2a14b4] text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Watched ({watchedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <FaMagnifyingGlass className="absolute left-3.5 top-3.5 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search in ${activeProfileName}'s movies...`}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-[#2a14b4]"
            />
          </div>
        </section>

        {filtered.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((movie) => {
              const isWatched = movie.status === "watched";
              const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${movie.title} ${movie.year} trailer`
              )}`;

              return (
                <div
                  key={movie.movie_id}
                  className="bg-white rounded-3xl p-5 border border-[#e4e9f5] shadow-xs flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#1f2041]">
                          {movie.title} ({movie.year})
                        </h3>
                        <div className="flex flex-wrap items-center gap-1 mt-1 text-xs text-gray-500">
                          {movie.genres.join(" • ")}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                        <FaStar className="text-amber-500 text-[11px]" />
                        {movie.rating ? movie.rating.toFixed(1) : "N/A"}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-[#55576e] line-clamp-3 leading-relaxed">
                      {movie.overview}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">My Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(movie.movie_id, star)}
                            className={`text-sm cursor-pointer transition ${
                              (movie.userRating || 0) >= star
                                ? "text-amber-400 scale-110"
                                : "text-gray-200 hover:text-amber-300"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => handleToggleWatch(movie.movie_id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                        isWatched
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {isWatched ? (
                        <>
                          <FaCheck /> Watched
                        </>
                      ) : (
                        "Mark as Watched"
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-500 hover:text-[#2a14b4] hover:bg-[#eff4ff] transition"
                        title="Watch trailer"
                      >
                        <FaPlay className="text-xs" />
                      </a>

                      <button
                        onClick={() => handleRemove(movie.movie_id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Remove from Library"
                      >
                        <FaTrashCan className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ) : (
          <section className="bg-white rounded-3xl p-12 border border-dashed border-gray-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#2a14b4] flex items-center justify-center mx-auto text-xl">
              <FaBookmark />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No saved movies for {activeProfileName}</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              You haven&apos;t bookmarked any films for this profile yet. Start a chat with CineSafe to discover movies tailored to {activeProfileName}&apos;s phobias.
            </p>
            <Link
              href="/chatbot"
              className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#1f0d8a] transition"
            >
              Go to Chatbot <FaArrowRight />
            </Link>
          </section>
        )}

        <section className="bg-gradient-to-r from-[#eff4ff] to-[#f4f1ff] border border-[#d6e3fb] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-[#1f2041]">
              Looking for more phobia-safe movies?
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Talk to CineSafe Assistant anytime to explore more tailored recommendations for {activeProfileName}.
            </p>
          </div>

          <Link
            href="/chatbot"
            className="bg-[#2a14b4] text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-[#1f0d8a] transition shadow-xs whitespace-nowrap"
          >
            <FaComments /> Open Chatbot
          </Link>
        </section>
      </div>
    </div>
  );
}
