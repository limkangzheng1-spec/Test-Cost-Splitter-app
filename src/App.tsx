import { useState, useEffect } from "react";
import { HangoutEvent, Friend, Activity } from "./types";
import {
  DEFAULT_EVENTS,
  DEFAULT_FRIENDS,
  DEFAULT_ACTIVITIES,
} from "./data/initialData";
import { UserView } from "./components/UserView";
import { PaiderView } from "./components/PaiderView";
import { AdminView } from "./components/AdminView";
import { GasExportModal } from "./components/GasExportModal";
import {
  Receipt,
  User,
  Settings,
  Calendar,
  Database,
  X,
  ChevronRight,
  Cloud,
  Share2,
  Check,
  Copy,
} from "lucide-react";
import { Language, Theme, translations } from "./utils/i18n";
import {
  subscribeEvents,
  subscribeFriends,
  subscribeActivities,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveFriendToFirestore,
  deleteFriendFromFirestore,
  saveActivityToFirestore,
  deleteActivityFromFirestore,
} from "./firebase";
import { copyToClipboard } from "./utils/clipboard";
import { getShareableAppUrl } from "./utils/summaryFormatter";

export default function App() {
  // Load state from localStorage or defaults
  const [events, setEvents] = useState<HangoutEvent[]>(() => {
    const saved = localStorage.getItem("hangout_events");
    return saved ? JSON.parse(saved) : DEFAULT_EVENTS;
  });

  const [currentEventId, setCurrentEventId] = useState<string>(() => {
    // Check URL query param first
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEvt = urlParams.get("event");
      if (urlEvt) return urlEvt;
    }
    const saved = localStorage.getItem("hangout_current_event_id");
    return saved || events[0]?.eventId || "EVT_SAMPLE_1";
  });

  const [friends, setFriends] = useState<Friend[]>(() => {
    const saved = localStorage.getItem("hangout_friends");
    return saved ? JSON.parse(saved) : DEFAULT_FRIENDS;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem("hangout_activities");
    return saved ? JSON.parse(saved) : DEFAULT_ACTIVITIES;
  });

  // Language & Theme states with local storage persistence
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("hangout_lang");
    return saved === "zh" ? "zh" : "en";
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("hangout_theme");
    return saved === "dark" ? "dark" : "light";
  });

  const [activeTab, setActiveTab] = useState<"user" | "paider" | "admin">("user");
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // -------------------------------------------------------------
  // FIRESTORE REAL-TIME SYNCHRONIZATION
  // -------------------------------------------------------------

  // 1. Subscribe to all Events from Firestore
  useEffect(() => {
    const unsubscribe = subscribeEvents(
      (firestoreEvents) => {
        setIsCloudSynced(true);
        if (firestoreEvents.length > 0) {
          setEvents(firestoreEvents);
          setCurrentEventId((prev) => {
            const found = firestoreEvents.some((e) => e.eventId === prev);
            return found ? prev : firestoreEvents[0].eventId;
          });
        } else {
          // Auto-seed initial sample event if cloud DB is completely fresh
          const seedEvent = DEFAULT_EVENTS[0];
          saveEventToFirestore(seedEvent).catch(console.warn);
          DEFAULT_FRIENDS.forEach((f) => saveFriendToFirestore(seedEvent.eventId, f).catch(console.warn));
          DEFAULT_ACTIVITIES.forEach((a) => saveActivityToFirestore(seedEvent.eventId, a).catch(console.warn));
        }
      },
      (err) => {
        console.warn("Firestore sync fallback to local:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Friends and Activities of the active Event
  useEffect(() => {
    if (!currentEventId) return;

    const unsubFriends = subscribeFriends(currentEventId, (firestoreFriends) => {
      if (firestoreFriends.length > 0) {
        setFriends((prev) => {
          const others = prev.filter((f) => f.eventId !== currentEventId);
          return [...others, ...firestoreFriends];
        });
      }
    });

    const unsubActivities = subscribeActivities(currentEventId, (firestoreActivities) => {
      setActivities((prev) => {
        const others = prev.filter((a) => a.eventId !== currentEventId);
        return [...others, ...firestoreActivities];
      });
    });

    return () => {
      unsubFriends();
      unsubActivities();
    };
  }, [currentEventId]);

  // Sync to local storage with safe quota guards (backup cache)
  useEffect(() => {
    try {
      localStorage.setItem("hangout_events", JSON.stringify(events));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem("hangout_current_event_id", currentEventId);
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }, [currentEventId]);

  useEffect(() => {
    try {
      localStorage.setItem("hangout_friends", JSON.stringify(friends));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }, [friends]);

  useEffect(() => {
    try {
      localStorage.setItem("hangout_activities", JSON.stringify(activities));
    } catch (e) {
      console.warn("Storage quota warning on activities:", e);
    }
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem("hangout_lang", language);
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem("hangout_theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }, [theme]);

  // Derived current event & filtered items
  const currentEvent =
    events.find((e) => e.eventId === currentEventId) ||
    events[0] || {
      eventId: "DEFAULT",
      eventName: "Hangout Event",
      eventDate: new Date().toISOString().split("T")[0],
    };

  const currentFriends = friends.filter((f) => f.eventId === currentEvent.eventId);
  const currentActivities = activities.filter((a) => a.eventId === currentEvent.eventId);

  const t = translations[language];
  const isDark = theme === "dark";

  // Event handlers with Cloud Sync
  const handleCreateEvent = async (name: string, date: string) => {
    const newEvent: HangoutEvent = {
      eventId: `EVT_${Date.now()}`,
      eventName: name,
      eventDate: date,
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    setCurrentEventId(newEvent.eventId);

    // Save event to Firestore
    await saveEventToFirestore(newEvent).catch(console.warn);

    // Auto-create sample friends for this new event
    const sampleFriends: Friend[] = [
      { friendId: `FRD_${Date.now()}_1`, eventId: newEvent.eventId, friendName: language === "zh" ? "好友 1" : "Friend 1" },
      { friendId: `FRD_${Date.now()}_2`, eventId: newEvent.eventId, friendName: language === "zh" ? "好友 2" : "Friend 2" },
      { friendId: `FRD_${Date.now()}_3`, eventId: newEvent.eventId, friendName: language === "zh" ? "好友 3" : "Friend 3" },
    ];
    setFriends((prev) => [...prev, ...sampleFriends]);
    for (const sf of sampleFriends) {
      await saveFriendToFirestore(newEvent.eventId, sf).catch(console.warn);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
    setFriends((prev) => prev.filter((f) => f.eventId !== eventId));
    setActivities((prev) => prev.filter((a) => a.eventId !== eventId));
    if (currentEventId === eventId) {
      const remaining = events.filter((e) => e.eventId !== eventId);
      if (remaining.length > 0) setCurrentEventId(remaining[0].eventId);
    }
    await deleteEventFromFirestore(eventId).catch(console.warn);
  };

  const handleAddFriend = async (eventId: string, friendName: string) => {
    const newFriend: Friend = {
      friendId: `FRD_${Date.now()}`,
      eventId,
      friendName,
    };
    setFriends((prev) => [...prev, newFriend]);
    await saveFriendToFirestore(eventId, newFriend).catch(console.warn);
  };

  const handleRemoveFriend = async (friendId: string) => {
    setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
    await deleteFriendFromFirestore(currentEvent.eventId, friendId).catch(console.warn);
  };

  const handleSaveActivity = async (activity: Activity) => {
    setActivities((prev) => {
      const idx = prev.findIndex((a) => a.activityId === activity.activityId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = activity;
        return copy;
      } else {
        return [activity, ...prev];
      }
    });
    await saveActivityToFirestore(currentEvent.eventId, activity).catch(console.warn);
  };

  const handleDeleteActivity = async (activityId: string) => {
    setActivities((prev) => prev.filter((a) => a.activityId !== activityId));
    await deleteActivityFromFirestore(currentEvent.eventId, activityId).catch(console.warn);
  };

  const handleResetDemoData = async () => {
    setEvents(DEFAULT_EVENTS);
    setCurrentEventId(DEFAULT_EVENTS[0].eventId);
    setFriends(DEFAULT_FRIENDS);
    setActivities(DEFAULT_ACTIVITIES);

    // Re-seed in cloud
    const seedEvent = DEFAULT_EVENTS[0];
    await saveEventToFirestore(seedEvent).catch(console.warn);
    for (const f of DEFAULT_FRIENDS) {
      await saveFriendToFirestore(seedEvent.eventId, f).catch(console.warn);
    }
    for (const a of DEFAULT_ACTIVITIES) {
      await saveActivityToFirestore(seedEvent.eventId, a).catch(console.warn);
    }
  };

  const handleCopyEventLink = async () => {
    const url = getShareableAppUrl(currentEvent.eventId);
    await copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className={`${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"} min-h-screen flex justify-center selection:bg-indigo-500 selection:text-white font-sans antialiased transition-colors duration-200`}>
      {/* Mobile-first centered frame */}
      <div className={`w-full max-w-md min-h-screen ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200/80"} flex flex-col shadow-2xl relative border-x transition-colors duration-200`}>
        
        {/* TOP APP HEADER */}
        <header className={`sticky top-0 z-40 ${isDark ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"} backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-2xs`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-slate-900"} leading-tight`}>
                {t.appName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} font-medium truncate max-w-[120px]`}>
                  {currentEvent.eventName}
                </p>
                {isCloudSynced && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    title="Real-time Cloud Synced via Firebase (smart-cost-split-application)"
                  >
                    <Cloud className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                    <span>Cloud</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Event Switcher */}
            <button
              onClick={() => setIsEventModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"} text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.selectEvent}</span>
            </button>

            {/* GAS & Sheets Code Modal Button */}
            <button
              onClick={() => setIsGasModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl ${isDark ? "bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-800" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"} border text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer`}
              title={language === "zh" ? "Google 表格与 Apps Script 脚本代码" : "Google Sheets & Apps Script Code"}
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t.gasCodeBtn}</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto">
          {activeTab === "user" && (
            <UserView
              currentEvent={currentEvent}
              friends={currentFriends}
              activities={currentActivities}
              language={language}
            />
          )}

          {activeTab === "paider" && (
            <PaiderView
              currentEvent={currentEvent}
              friends={currentFriends}
              activities={currentActivities}
              onSaveActivity={handleSaveActivity}
              onDeleteActivity={handleDeleteActivity}
              onSwitchEvent={() => setIsEventModalOpen(true)}
              language={language}
            />
          )}

          {activeTab === "admin" && (
            <AdminView
              events={events}
              currentEventId={currentEvent.eventId}
              friends={currentFriends}
              language={language}
              theme={theme}
              onLanguageChange={setLanguage}
              onThemeChange={setTheme}
              onSelectEvent={(id) => setCurrentEventId(id)}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
              onAddFriend={handleAddFriend}
              onRemoveFriend={handleRemoveFriend}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className={`fixed bottom-0 z-40 w-full max-w-md ${isDark ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"} backdrop-blur-md border-t px-6 py-2 flex items-center justify-around shadow-lg`}>
          {/* User Tab: My Bill */}
          <button
            onClick={() => setActiveTab("user")}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === "user"
                ? "text-indigo-500 font-bold"
                : isDark ? "text-slate-500 hover:text-slate-300 font-medium" : "text-slate-400 hover:text-slate-600 font-medium"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">{t.navUser}</span>
          </button>

          {/* Paider Tab: Expenses */}
          <button
            onClick={() => setActiveTab("paider")}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === "paider"
                ? "text-indigo-500 font-bold"
                : isDark ? "text-slate-500 hover:text-slate-300 font-medium" : "text-slate-400 hover:text-slate-600 font-medium"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">{t.navPaider}</span>
          </button>

          {/* Admin Tab: PIN 666 */}
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === "admin"
                ? "text-indigo-500 font-bold"
                : isDark ? "text-slate-500 hover:text-slate-300 font-medium" : "text-slate-400 hover:text-slate-600 font-medium"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">{t.navAdmin}</span>
          </button>
        </nav>

        {/* QUICK EVENT SWITCHER MODAL */}
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-100 text-slate-900"} w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 border`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>{t.selectEvent}</span>
                </h3>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className={`w-7 h-7 rounded-full ${isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"} flex items-center justify-center transition cursor-pointer`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {events.map((ev) => (
                  <button
                    key={ev.eventId}
                    onClick={() => {
                      setCurrentEventId(ev.eventId);
                      setIsEventModalOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      ev.eventId === currentEvent.eventId
                        ? isDark
                          ? "bg-indigo-950/70 border-indigo-500 text-white font-bold"
                          : "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold"
                        : isDark
                          ? "bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold leading-tight">{ev.eventName}</p>
                      <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"} mt-0.5`}>
                        {ev.eventDate || t.eventNotSet}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyEventLink}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition py-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>
                    {copiedLink
                      ? language === "zh"
                        ? "已复制聚会链接！"
                        : "Link Copied!"
                      : language === "zh"
                      ? "复制此聚会专属链接"
                      : "Share Event URL"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsEventModalOpen(false);
                    setActiveTab("admin");
                  }}
                  className="text-xs font-semibold text-indigo-500 py-1 hover:underline cursor-pointer shrink-0"
                >
                  + {t.createEventTitle}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAS EXPORT & SETUP MODAL */}
        <GasExportModal
          isOpen={isGasModalOpen}
          onClose={() => setIsGasModalOpen(false)}
          language={language}
        />
      </div>
    </div>
  );
}
