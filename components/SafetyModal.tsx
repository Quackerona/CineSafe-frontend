"use client";

import React, { useState, useEffect } from "react";
import { Topic, UserProfile } from "@/lib/types";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import { FaXmark, FaShieldHalved, FaMagnifyingGlass } from "react-icons/fa6";

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function SafetyModal({ isOpen, onClose, onUpdated }: SafetyModalProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setProfile(storage.getUser());

    api
      .getTopics()
      .then(setTopics)
      .catch(() => {
        setTopics([
          { topic_id: 1, name: "spiders", category: "Animals", covers: [] },
          { topic_id: 2, name: "a dog dies", category: "Animals", covers: [] },
          { topic_id: 4, name: "needles", category: "Medical", covers: [] },
          { topic_id: 6, name: "jump scares", category: "Scary", covers: [] },
          { topic_id: 7, name: "blood and gore", category: "Violence", covers: [] },
          { topic_id: 9, name: "claustrophobic scenes", category: "Spaces", covers: [] },
          { topic_id: 11, name: "an animal dies", category: "Animals", covers: [2] },
        ]);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPrefs = profile?.topic_prefs || [];

  const getStrictness = (topicId: number) => {
    return currentPrefs.find((p) => p.topic_id === topicId)?.strictness || "fine";
  };

  const setStrictness = async (topicId: number, strictness: "never" | "warn" | "fine") => {
    if (!profile) return;
    setBusyId(topicId);

    try {
      const updated = await api.updatePreference(profile.user_id, topicId, strictness);
      setProfile(updated);
      storage.setUser(updated);
      onUpdated?.();
    } catch {
      const nextPrefs = currentPrefs.filter((p) => p.topic_id !== topicId);
      if (strictness !== "fine") {
        const found = topics.find((t) => t.topic_id === topicId);
        nextPrefs.push({
          topic_id: topicId,
          name: found ? found.name : `Topic ${topicId}`,
          strictness,
        });
      }
      const localUpdated = { ...profile, topic_prefs: nextPrefs };
      setProfile(localUpdated);
      storage.setUser(localUpdated);
      onUpdated?.();
    } finally {
      setBusyId(null);
    }
  };

  const categories = ["All", ...Array.from(new Set(topics.map((t) => t.category)))];

  const filteredTopics = topics.filter((t) => {
    const matchesCat = category === "All" || t.category === category;
    const matchesQuery = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#eff4ff] text-[#2a14b4] rounded-xl text-lg">
              <FaShieldHalved />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1e2038]">Phobia Safety Settings</h2>
              <p className="text-xs text-gray-500">
                Managed locally and synchronized with CineSafe AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 text-lg rounded-lg cursor-pointer"
          >
            <FaXmark />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div className="relative">
            <FaMagnifyingGlass className="absolute left-3.5 top-3.5 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search triggers (e.g. spiders, blood, jump scares...)"
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8f9fc] rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-[#2a14b4]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition ${
                  category === cat
                    ? "bg-[#2a14b4] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-1">
          {filteredTopics.map((topic) => {
            const current = getStrictness(topic.topic_id);
            const isBusy = busyId === topic.topic_id;

            return (
              <div key={topic.topic_id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800 capitalize">
                      {topic.name}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                      {topic.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setStrictness(topic.topic_id, "never")}
                    disabled={isBusy}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium cursor-pointer transition ${
                      current === "never"
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    Never
                  </button>

                  <button
                    onClick={() => setStrictness(topic.topic_id, "warn")}
                    disabled={isBusy}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium cursor-pointer transition ${
                      current === "warn"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                    }`}
                  >
                    Warn
                  </button>

                  <button
                    onClick={() => setStrictness(topic.topic_id, "fine")}
                    disabled={isBusy}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium cursor-pointer transition ${
                      current === "fine"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
                    }`}
                  >
                    Fine
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Active profile: <strong>{profile?.name || "Guest"}</strong> ({currentPrefs.length} safety rules)
          </span>
          <button
            onClick={onClose}
            className="bg-[#2a14b4] text-white px-5 py-2 rounded-xl font-medium hover:bg-[#1e0d8f] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
