"use client";

import React, { useState, useEffect } from "react";
import { Topic, UserProfile, Strictness } from "@/lib/types";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import {
  FaMagnifyingGlass,
  FaCircleCheck,
  FaUser,
  FaPen,
  FaCheck,
  FaXmark,
  FaPlus,
  FaTrashCan,
} from "react-icons/fa6";

export default function ProfilePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  useEffect(() => {
    loadProfileData();

    api
      .getTopics()
      .then((data) => setTopics(data))
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
  }, []);

  const loadProfileData = () => {
    const profiles = storage.getAllProfiles();
    setAllProfiles(profiles);

    const current = storage.getUser();
    setUserProfile(current);
    setNameInput(current?.name || "");

    // Verify user on backend; if missing, re-register immediately
    if (current?.user_id) {
      api
        .getUser(current.user_id)
        .then((remoteProfile) => {
          setUserProfile(remoteProfile);
          setNameInput(remoteProfile.name);
          storage.setUser(remoteProfile);
          setAllProfiles(storage.getAllProfiles());
        })
        .catch(async (err: any) => {
          if (err.message?.includes("no user") || err.message?.includes("404")) {
            try {
              const recreated = await api.createUser(current.name || "Alex");
              for (const pref of current.topic_prefs || []) {
                try {
                  await api.updatePreference(recreated.user_id, pref.topic_id, pref.strictness);
                } catch {}
              }
              const reSynced: UserProfile = {
                ...recreated,
                name: current.name,
                topic_prefs: current.topic_prefs || [],
              };
              storage.setUser(reSynced);
              setUserProfile(reSynced);
              setAllProfiles(storage.getAllProfiles());
            } catch {}
          }
        });
    }
  };

  const handleSwitchProfile = (userId: string) => {
    const switched = storage.setActiveProfile(userId);
    setUserProfile(switched);
    setNameInput(switched.name);
    setAllProfiles(storage.getAllProfiles());
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) return;

    setIsCreatingLoading(true);

    try {
      const createdUser = await api.createUser(trimmed);
      const newProfile: UserProfile = {
        ...createdUser,
        name: trimmed,
        topic_prefs: [],
      };
      storage.setUser(newProfile);
    } catch {
      const localId = `user_${Date.now().toString(36)}`;
      const newProfile: UserProfile = {
        user_id: localId,
        name: trimmed,
        topic_prefs: [],
      };
      storage.setUser(newProfile);
    } finally {
      setIsCreatingLoading(false);
      setIsCreatingProfile(false);
      setNewProfileName("");
      loadProfileData();
    }
  };

  const handleDeleteProfile = (userId: string) => {
    if (allProfiles.length <= 1) {
      alert("You must keep at least one profile.");
      return;
    }
    if (confirm("Delete this profile and its preferences?")) {
      const remainingActive = storage.deleteProfile(userId);
      setUserProfile(remainingActive);
      setNameInput(remainingActive.name);
      setAllProfiles(storage.getAllProfiles());
    }
  };

  const currentPrefs = userProfile?.topic_prefs || [];
  const getStrictness = (topicId: number): Strictness | "fine" => {
    const found = currentPrefs.find((p) => p.topic_id === topicId);
    return found ? found.strictness : "fine";
  };

  const handleUpdate = async (topicId: number, strictness: "never" | "warn" | "fine") => {
    if (!userProfile) return;
    setIsUpdating(topicId);

    try {
      const updated = await api.updatePreference(userProfile.user_id, topicId, strictness);
      setUserProfile(updated);
      storage.setUser(updated);
      setAllProfiles(storage.getAllProfiles());
    } catch (err: any) {
      // If user vanished from backend, recreate on the fly and apply preference
      if (err.message?.includes("no user") || err.message?.includes("404")) {
        try {
          const recreated = await api.createUser(userProfile.name || "Alex");
          const updated = await api.updatePreference(recreated.user_id, topicId, strictness);
          const reSynced: UserProfile = { ...updated, name: userProfile.name };
          setUserProfile(reSynced);
          storage.setUser(reSynced);
          setAllProfiles(storage.getAllProfiles());
          return;
        } catch {}
      }

      const newPrefs = currentPrefs.filter((p) => p.topic_id !== topicId);
      if (strictness !== "fine") {
        const topic = topics.find((t) => t.topic_id === topicId);
        newPrefs.push({
          topic_id: topicId,
          name: topic ? topic.name : `Topic ${topicId}`,
          strictness,
        });
      }
      const localUpdated: UserProfile = { ...userProfile, topic_prefs: newPrefs };
      setUserProfile(localUpdated);
      storage.setUser(localUpdated);
      setAllProfiles(storage.getAllProfiles());
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !userProfile || trimmed === userProfile.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);

    try {
      const newUser = await api.createUser(trimmed);
      for (const pref of currentPrefs) {
        try {
          await api.updatePreference(newUser.user_id, pref.topic_id, pref.strictness);
        } catch {}
      }

      const updatedProfile: UserProfile = {
        ...newUser,
        name: trimmed,
        topic_prefs: currentPrefs,
      };

      setUserProfile(updatedProfile);
      storage.setUser(updatedProfile);
      setAllProfiles(storage.getAllProfiles());
    } catch {
      const updatedProfile: UserProfile = {
        ...userProfile,
        name: trimmed,
      };
      setUserProfile(updatedProfile);
      storage.setUser(updatedProfile);
      setAllProfiles(storage.getAllProfiles());
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(topics.map((t) => t.category)))];

  const filteredTopics = topics.filter((t) => {
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const neverCount = currentPrefs.filter((p) => p.strictness === "never").length;
  const warnCount = currentPrefs.filter((p) => p.strictness === "warn").length;

  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Switcher & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Profile:
            </span>
            <select
              value={userProfile?.user_id || ""}
              onChange={(e) => handleSwitchProfile(e.target.value)}
              className="text-xs font-semibold text-[#2a14b4] bg-[#eff4ff] border border-[#cbd9ff] rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {allProfiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.name} ({p.topic_prefs?.length || 0} rules)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingProfile(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a14b4] hover:bg-[#200f8f] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <FaPlus className="text-[10px]" /> New Profile
            </button>
            {allProfiles.length > 1 && (
              <button
                onClick={() => userProfile && handleDeleteProfile(userProfile.user_id)}
                title="Delete this profile"
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <FaTrashCan className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Details Header */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#2a14b4] flex items-center justify-center text-2xl font-bold shrink-0">
              <FaUser />
            </div>
            <div>
              <span className="text-xs font-bold text-[#2a14b4] tracking-wider uppercase">
                Profile Settings
              </span>

              <div className="flex items-center gap-2 mt-0.5">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="text-xl font-bold text-gray-900 border border-[#2a14b4] rounded-lg px-2.5 py-0.5 focus:outline-none bg-white"
                      autoFocus
                      disabled={isSavingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName || !nameInput.trim()}
                      className="p-1.5 text-xs bg-[#2a14b4] text-white rounded-md hover:bg-[#200f8f] transition cursor-pointer"
                      title="Save"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={() => {
                        setNameInput(userProfile?.name || "Alex");
                        setIsEditingName(false);
                      }}
                      className="p-1.5 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition cursor-pointer"
                      title="Cancel"
                    >
                      <FaXmark />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black text-gray-900">
                      {userProfile?.name || "Alex"}
                    </h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 text-xs text-gray-400 hover:text-[#2a14b4] hover:bg-[#eff4ff] rounded-md transition cursor-pointer"
                      title="Edit name"
                    >
                      <FaPen />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Configure permanent phobia rules for this profile. The AI strictly obeys "Never show".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#eff4ff] border border-[#d6e3fb] p-3 rounded-2xl text-center min-w-24">
              <span className="text-xl font-black text-[#2a14b4]">{neverCount}</span>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Never Show</p>
            </div>
            <div className="bg-[#fffbeb] border border-[#fef08a] p-3 rounded-2xl text-center min-w-24">
              <span className="text-xl font-black text-amber-600">{warnCount}</span>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Warn Me</p>
            </div>
          </div>
        </section>

        {/* Preferences Manager */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="relative flex-1">
              <FaMagnifyingGlass className="absolute left-3.5 top-3.5 text-gray-400 text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search triggers (e.g. spiders, blood, jump scares...)"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-[#2a14b4]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer transition font-medium ${
                    selectedCategory === cat
                      ? "bg-[#2a14b4] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto pr-1">
            {filteredTopics.map((topic) => {
              const current = getStrictness(topic.topic_id);
              const loading = isUpdating === topic.topic_id;

              return (
                <div key={topic.topic_id} className="py-3.5 flex items-center justify-between gap-4">
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
                      onClick={() => handleUpdate(topic.topic_id, "never")}
                      disabled={loading}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium cursor-pointer transition ${
                        current === "never"
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
                      }`}
                    >
                      Never
                    </button>

                    <button
                      onClick={() => handleUpdate(topic.topic_id, "warn")}
                      disabled={loading}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium cursor-pointer transition ${
                        current === "warn"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                      }`}
                    >
                      Warn
                    </button>

                    <button
                      onClick={() => handleUpdate(topic.topic_id, "fine")}
                      disabled={loading}
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

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <FaCircleCheck className="text-emerald-500" /> Changes saved to profile and synced with the assistant.
            </span>
          </div>
        </section>

        {/* Create Profile Modal */}
        {isCreatingProfile && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Create New Profile</h3>
                <button
                  onClick={() => setIsCreatingProfile(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-md cursor-pointer"
                >
                  <FaXmark />
                </button>
              </div>

              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Jordan, Film Buff, Kids"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#2a14b4]"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingProfile(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingLoading || !newProfileName.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2a14b4] hover:bg-[#200f8f] rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    {isCreatingLoading ? "Creating..." : "Create Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
