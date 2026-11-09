"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, MovieResult, UserProfile } from "@/lib/types";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import MovieRecommendationCard from "@/components/Movies/MovieRecommendationCard";
import SafetyModal from "@/components/SafetyModal";
import { FaArrowUp, FaRotateRight, FaSliders, FaTrashCan } from "react-icons/fa6";

const QUICK_PROMPTS = [
  "Horror with no jump scares",
  "Thriller where no dog dies",
  "Sci-fi without claustrophobia",
  "Heartwarming family comedy",
];

export default function ChatbotPage() {
  const [activeProfileName, setActiveProfileName] = useState("Alex");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [movieSummary, setMovieSummary] = useState<MovieResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadActiveProfileData = () => {
    const currentUser = storage.getUser();
    setActiveProfileName(currentUser.name || "Alex");

    setMessages(storage.getChatHistory());
    setMovieSummary(storage.getMovieSummary());

    const activeSession = storage.getSessionId();
    if (activeSession) {
      setSessionId(activeSession);
    } else {
      createFreshSession(currentUser.user_id);
    }
  };

  useEffect(() => {
    loadActiveProfileData();

    window.addEventListener("cinesafe_profile_switched", loadActiveProfileData);
    return () => {
      window.removeEventListener("cinesafe_profile_switched", loadActiveProfileData);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const createFreshSession = async (customUserId?: string): Promise<string> => {
    const currentUser = storage.getUser();
    const userId = customUserId || currentUser.user_id;

    try {
      const res = await api.createSession(userId);
      setSessionId(res.session_id);
      storage.setSessionId(res.session_id);
      return res.session_id;
    } catch (err: any) {
      // If the backend was restarted and lost the user, automatically re-register them
      if (err.message?.includes("no user") || err.message?.includes("404")) {
        try {
          const registered = await api.createUser(currentUser.name || "Alex");

          for (const pref of currentUser.topic_prefs || []) {
            try {
              await api.updatePreference(registered.user_id, pref.topic_id, pref.strictness);
            } catch {}
          }

          const updatedUser: UserProfile = {
            ...registered,
            name: currentUser.name || "Alex",
            topic_prefs: currentUser.topic_prefs || [],
          };
          storage.setUser(updatedUser);

          const retryRes = await api.createSession(registered.user_id);
          setSessionId(retryRes.session_id);
          storage.setSessionId(retryRes.session_id);
          return retryRes.session_id;
        } catch {
          // Fallback to demo user if backend mock is in strict mode
          const fallbackRes = await api.createSession("arachno");
          setSessionId(fallbackRes.session_id);
          storage.setSessionId(fallbackRes.session_id);
          return fallbackRes.session_id;
        }
      }
      throw err;
    }
  };

  const handleClearChat = async () => {
    if (messages.length === 0) return;
    if (confirm(`Clear chat history for ${activeProfileName}?`)) {
      storage.clearChatHistory();
      storage.clearSession();
      setMessages([]);
      await createFreshSession();
    }
  };

  const handleClearCards = () => {
    if (movieSummary.length === 0) return;
    if (confirm(`Clear movie cards for ${activeProfileName}?`)) {
      storage.clearMovieSummary();
      setMovieSummary([]);
    }
  };

  const handleResetAll = async () => {
    if (confirm(`Reset chat and movie cards for ${activeProfileName}?`)) {
      storage.clearChatHistory();
      storage.clearMovieSummary();
      storage.clearSession();
      setMessages([]);
      setMovieSummary([]);
      await createFreshSession();
    }
  };

  const parseMoviesFromText = (text: string): MovieResult[] => {
    const lines = text.split("\n");
    const extracted: MovieResult[] = [];
    for (const line of lines) {
      const match = line.match(/(?:^\d+\.\s*|^-\s*)([A-Za-z0-9\s:,'-]+?)\s*(?:\((\d{4})\))?/);
      if (match && match[1].trim().length > 2) {
        const title = match[1].trim();
        const year = match[2] ? parseInt(match[2], 10) : new Date().getFullYear();
        extracted.push({
          movie_id: title.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          title,
          year,
          rating: 7.5,
          genres: ["Recommended"],
          overview: line.replace(match[0], "").trim() || "Recommended by assistant.",
          warnings: [],
          unknown_topics: [],
        });
      }
    }
    return extracted;
  };

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: userPrompt.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    storage.setChatHistory(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      let activeSession = sessionId;
      if (!activeSession) {
        activeSession = await createFreshSession();
      }

      let reply;
      try {
        reply = await api.sendMessage(activeSession, userPrompt.trim());
      } catch (err: any) {
        if (err.message?.includes("no session") || err.message?.includes("404")) {
          activeSession = await createFreshSession();
          reply = await api.sendMessage(activeSession, userPrompt.trim());
        } else {
          throw err;
        }
      }

      const returnedMovies =
        reply.movies && reply.movies.length > 0
          ? reply.movies
          : parseMoviesFromText(reply.reply);

      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: "bot",
        text: reply.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        movies: returnedMovies,
        pendingProfileUpdate: reply.pending_profile_update,
      };

      const finalHistory = [...updatedHistory, botMessage];
      setMessages(finalHistory);
      storage.setChatHistory(finalHistory);

      if (returnedMovies.length > 0) {
        setMovieSummary((prev) => {
          const newTitles = new Set(returnedMovies.map((m) => (m.title || "").toLowerCase()));
          const existingFiltered = prev.filter(
            (m) => !newTitles.has((m.title || "").toLowerCase())
          );
          const combined = [...returnedMovies, ...existingFiltered];
          storage.setMovieSummary(combined);
          return combined;
        });
      }
    } catch (err: any) {
      console.error("API error:", err);
      const errorMessage: ChatMessage = {
        id: `bot_err_${Date.now()}`,
        sender: "bot",
        text: `Error: ${err.message || "Failed to reach backend."}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalHistory = [...updatedHistory, errorMessage];
      setMessages(finalHistory);
      storage.setChatHistory(finalHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const validMovies = (movieSummary || []).filter(
    (m): m is MovieResult => Boolean(m && typeof m === "object" && (m.title || m.movie_id))
  );

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 w-full h-full min-h-0 overflow-hidden">
      {/* LEFT PANE: Chat Interface */}
      <section className="flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 h-full min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2a14b4] uppercase tracking-wider">Chat</span>
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              Profile: {activeProfileName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              title="Clear Chat Messages"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <FaTrashCan className="text-xs" />
            </button>
            <button
              onClick={handleResetAll}
              title="Reset All (Chat & Cards)"
              className="p-1.5 text-gray-400 hover:text-[#2a14b4] hover:bg-[#eff4ff] rounded-md transition cursor-pointer"
            >
              <FaRotateRight className="text-xs" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">CineSafe Assistant</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                Send a prompt or select a quick starter below for {activeProfileName}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] bg-[#2a14b4] text-white rounded-xl px-4 py-2.5 text-xs leading-relaxed prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                      <span className="block text-[10px] text-white/70 text-right mt-1">{msg.time}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex items-start gap-2.5">
                  <div className="flex-1 bg-[#eff4ff]/50 border border-[#d6e3fb] rounded-xl p-3.5 text-xs text-gray-800 leading-relaxed space-y-2 prose prose-xs max-w-none break-words">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {msg.pendingProfileUpdate && (
                      <div className="p-3 bg-white rounded-lg border border-gray-200 mt-2 not-prose shadow-xs">
                        <p className="font-semibold text-[#2a14b4] text-xs">
                          Proposal: Set "{msg.pendingProfileUpdate.topic_name}" to {msg.pendingProfileUpdate.strictness} for {activeProfileName}?
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => handleSendMessage("yes")}
                            className="bg-[#2a14b4] text-white px-3 py-1 rounded text-xs font-medium cursor-pointer hover:bg-[#200f8f]"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleSendMessage("no")}
                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium cursor-pointer hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-[#2a14b4] italic pl-2">
              <div className="w-3.5 h-3.5 border-2 border-[#2a14b4] border-t-transparent rounded-full animate-spin" />
              Thinking and verifying safety...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 sm:p-4 border-t border-gray-200 bg-white shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-md bg-[#eff4ff] hover:bg-[#dce7ff] text-[#2a14b4] shrink-0 text-xs cursor-pointer border border-[#cbd9ff] disabled:opacity-50 font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="relative flex items-center rounded-xl bg-gray-50 border border-gray-300 focus-within:border-[#2a14b4] transition"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(input);
                }
              }}
              placeholder={`Ask for movies or phobias to avoid (${activeProfileName})...`}
              disabled={isLoading}
              className="w-full px-3 py-2.5 pr-14 text-xs text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-24 leading-relaxed"
            />

            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSafetyModalOpen(true)}
                title="Safety Settings"
                className="p-1.5 text-gray-500 hover:text-[#2a14b4] rounded-md cursor-pointer"
              >
                <FaSliders className="text-xs" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 rounded-md bg-[#2a14b4] text-white flex items-center justify-center hover:bg-[#200f8f] disabled:opacity-40 cursor-pointer"
              >
                <FaArrowUp className="text-xs" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* RIGHT PANE: Card Window */}
      <section className="flex flex-col bg-[#f8f9ff] h-full min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2a14b4] uppercase tracking-wider">Summary & Movie Cards</span>
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {activeProfileName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-[#eff4ff] text-[#2a14b4] px-2 py-0.5 rounded">
              {validMovies.length}
            </span>
            <button
              onClick={handleClearCards}
              disabled={validMovies.length === 0}
              title="Clear Movie Cards"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <FaTrashCan className="text-xs" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0">
          {validMovies.length > 0 ? (
            validMovies.map((movie, idx) => (
              <MovieRecommendationCard
                key={movie.movie_id || movie.title || `rec-${idx}`}
                movie={movie}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-center p-6 text-gray-400 text-xs">
              No movie cards generated for {activeProfileName} yet.
            </div>
          )}
        </div>
      </section>

      <SafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />
    </div>
  );
}
