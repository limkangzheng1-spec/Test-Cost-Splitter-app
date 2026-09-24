import { useState } from "react";
import { HangoutEvent, Friend } from "../types";
import {
  CalendarPlus,
  Users,
  Trash2,
  Sparkles,
  Calendar,
  Languages,
  Sun,
  Moon,
  Sliders,
  Settings,
} from "lucide-react";
import { Language, Theme, translations } from "../utils/i18n";

interface AdminViewProps {
  events: HangoutEvent[];
  currentEventId: string;
  friends: Friend[];
  language: Language;
  theme: Theme;
  onLanguageChange: (lang: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (name: string, date: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddFriend: (eventId: string, friendName: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onResetDemoData: () => void;
}

export function AdminView({
  events,
  currentEventId,
  friends,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onSelectEvent,
  onCreateEvent,
  onDeleteEvent,
  onAddFriend,
  onRemoveFriend,
  onResetDemoData,
}: AdminViewProps) {
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newFriendName, setNewFriendName] = useState("");

  const t = translations[language];
  const isDark = theme === "dark";

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    onCreateEvent(newEventName.trim(), newEventDate);
    setNewEventName("");
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim() || !currentEventId) return;
    onAddFriend(currentEventId, newFriendName.trim());
    setNewFriendName("");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"} border rounded-2xl p-4 flex items-center justify-between shadow-xs`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {t.adminDashboardTitle}
            </h2>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t.adminDashboardDesc}
            </p>
          </div>
        </div>
      </div>

      {/* SYSTEM PREFERENCES (Language EN / 中文 + Theme Light / Dark) */}
      <div className={`${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"} p-4 rounded-2xl border shadow-sm space-y-4`}>
        <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
              {t.systemPreferences}
            </h3>
            <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t.preferencesDesc}
            </p>
          </div>
        </div>

        {/* 1. Language Toggle (English EN vs 中文 ZH) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
            <div>
              <p className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {t.languageSetting}
              </p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                English / 中文
              </p>
            </div>
          </div>

          <div className={`flex rounded-xl p-1 border ${isDark ? "bg-slate-900 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                language === "en"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>English</span>
              <span className="text-[10px] opacity-80">(EN)</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("zh")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                language === "zh"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>中文</span>
              <span className="text-[10px] opacity-80">(ZH)</span>
            </button>
          </div>
        </div>

        {/* 2. Theme Toggle (Light Sun vs Dark Moon) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {isDark ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <div>
              <p className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {t.themeSetting}
              </p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {isDark ? t.darkMode : t.lightMode}
              </p>
            </div>
          </div>

          <div className={`flex rounded-xl p-1 border ${isDark ? "bg-slate-900 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
            <button
              type="button"
              onClick={() => onThemeChange("light")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                theme === "light"
                  ? "bg-amber-500 text-white shadow-xs"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t.lightMode}</span>
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("dark")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                theme === "dark"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t.darkMode}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 1: Create Event */}
      <div className={`${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"} p-4 rounded-2xl border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"} flex items-center gap-1.5`}>
            <CalendarPlus className="w-4 h-4 text-indigo-500" />
            <span>{t.createEventTitle}</span>
          </h3>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-2.5">
          <div>
            <label className={`block text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-slate-600"} mb-1`}>
              {t.eventTitleLabel}
            </label>
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder={t.eventTitlePlaceholder}
              className={`w-full border ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"} rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-slate-600"} mb-1`}>
              {t.eventDateLabel}
            </label>
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className={`w-full border ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"} rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-100 transition active:scale-95 cursor-pointer"
          >
            {t.createEventBtn}
          </button>
        </form>
      </div>

      {/* Card 2: Manage Friends for Current Event */}
      <div className={`${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200"} p-4 rounded-2xl border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"} flex items-center gap-1.5`}>
            <Users className="w-4 h-4 text-indigo-500" />
            <span>{t.manageFriendsTitle}</span>
          </h3>
          <span className={`text-xs ${isDark ? "bg-indigo-950 text-indigo-300" : "bg-indigo-50 text-indigo-700"} font-bold px-2 py-0.5 rounded-full`}>
            {friends.length} {t.friendsCount}
          </span>
        </div>

        <form onSubmit={handleAddFriend} className="flex gap-2">
          <input
            type="text"
            value={newFriendName}
            onChange={(e) => setNewFriendName(e.target.value)}
            placeholder={t.friendNamePlaceholder}
            className={`flex-1 border ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"} rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500`}
          />
          <button
            type="submit"
            className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
          >
            {t.addFriendBtn}
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {friends.length === 0 ? (
            <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} italic`}>
              {t.noFriendsInEvent}
            </p>
          ) : (
            friends.map((f) => (
              <div
                key={f.friendId}
                className={`inline-flex items-center gap-1.5 ${isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-800 hover:bg-slate-200"} px-3 py-1.5 rounded-xl text-xs font-semibold group transition`}
              >
                <span>{f.friendName}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFriend(f.friendId)}
                  className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title={language === "zh" ? "移除成员" : "Remove friend"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card 3: Active Events List */}
      <div className="space-y-2.5">
        <h3 className={`font-bold text-xs ${isDark ? "text-slate-400" : "text-slate-700"} uppercase tracking-wider`}>
          {t.activeEventsTitle}
        </h3>
        <div className="space-y-2">
          {events.map((ev) => {
            const isSelected = ev.eventId === currentEventId;
            return (
              <div
                key={ev.eventId}
                className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                  isSelected
                    ? isDark
                      ? "bg-indigo-950/60 border-indigo-500 shadow-sm"
                      : "bg-indigo-50/70 border-indigo-400 shadow-sm"
                    : isDark
                      ? "bg-slate-800 border-slate-700 hover:border-slate-600"
                      : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <h4 className={`font-bold text-xs ${isDark ? "text-white" : "text-slate-900"} flex items-center gap-1.5`}>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{ev.eventName}</span>
                  </h4>
                  <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} mt-0.5`}>
                    {t.eventDatePrefix}: {ev.eventDate || t.eventNotSet}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev.eventId)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : isDark
                          ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? t.activeStatus : t.selectBtn}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${t.confirmDeleteEvent} "${ev.eventName}"?`)) {
                        onDeleteEvent(ev.eventId);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                    title={language === "zh" ? "删除聚会活动" : "Delete Event"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo Reset helper */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            if (confirm(t.confirmResetData)) {
              onResetDemoData();
            }
          }}
          className={`text-xs font-semibold ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"} flex items-center justify-center gap-1 mx-auto cursor-pointer`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{t.restoreSampleData}</span>
        </button>
      </div>
    </div>
  );
}
