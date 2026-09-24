import { useState } from "react";
import { Activity, Friend, HangoutEvent, SettlementDebt, UserConsumptionItem } from "../types";
import {
  UserCheck,
  Utensils,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  User,
  Share2,
  Send,
  Eye,
} from "lucide-react";
import { WhatsAppShareModal } from "./WhatsAppShareModal";
import { Language, translations } from "../utils/i18n";
import { formatExpenseSummaryText } from "../utils/summaryFormatter";
import { shareSummary } from "../utils/shareUtils";

interface UserViewProps {
  currentEvent: HangoutEvent;
  friends: Friend[];
  activities: Activity[];
  language?: Language;
}

export function UserView({ currentEvent, friends, activities, language = "en" }: UserViewProps) {
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const t = translations[language] || translations.en;

  // Find selected friend object
  const selectedFriend = friends.find((f) => f.friendId === selectedFriendId);

  // -------------------------------------------------------------
  // MATHEMATICAL SETTLEMENT ENGINE
  // -------------------------------------------------------------
  let myTotalConsumption = 0;
  let myIndividualItems: UserConsumptionItem[] = [];

  // Pairwise directed debt graph: debts[debtorId][creditorId] = amount
  const debtGraph: Record<string, Record<string, number>> = {};
  friends.forEach((f1) => {
    debtGraph[f1.friendId] = {};
    friends.forEach((f2) => {
      debtGraph[f1.friendId][f2.friendId] = 0;
    });
  });

  // Total amount spent by each friend as a payer
  const totalPaidByFriend: Record<string, number> = {};
  friends.forEach((f) => {
    totalPaidByFriend[f.friendId] = 0;
  });

  activities.forEach((act) => {
    const payerId = act.paidByFriendId;
    const taxMultiplier =
      1 +
      (Number(act.sstPercent || 0) / 100) +
      (Number(act.serviceTaxPercent || 0) / 100);

    const payer = friends.find((f) => f.friendId === payerId);
    const payerName = payer ? payer.friendName : (language === "zh" ? "未知" : "Unknown");

    act.lineItems.forEach((item) => {
      const itemPrice = Number(item.price) || 0;
      let assignedFriendIds: string[] = [];

      if (item.assignedFriends === "ALL") {
        assignedFriendIds = friends.map((f) => f.friendId);
      } else {
        assignedFriendIds = (item.assignedFriends || "").split(",").filter(Boolean);
      }

      if (assignedFriendIds.length === 0) {
        assignedFriendIds = friends.map((f) => f.friendId);
      }

      // Formula 1: Per-Item Friend Portion
      const splitWays = assignedFriendIds.length > 0 ? assignedFriendIds.length : 1;
      const friendShareRaw = itemPrice / splitWays;
      // Formula 2 & 3: Portioned tax share and item total with tax
      const friendShareWithTax = friendShareRaw * taxMultiplier;
      const taxShare = friendShareWithTax - friendShareRaw;

      // If selected friend is in assigned list, track in personal consumption view
      if (selectedFriendId && assignedFriendIds.includes(selectedFriendId)) {
        myTotalConsumption += friendShareWithTax;
        myIndividualItems.push({
          activityName: act.activityName,
          itemName: item.itemName,
          rawPortion: friendShareRaw,
          calculatedTaxShare: taxShare,
          totalWithTax: friendShareWithTax,
          splitCount: assignedFriendIds.length,
          payerName,
        });
      }

      // Formula 4: Accumulate into pairwise debt graph
      assignedFriendIds.forEach((consumerId) => {
        if (
          consumerId !== payerId &&
          debtGraph[consumerId] &&
          debtGraph[consumerId][payerId] !== undefined
        ) {
          debtGraph[consumerId][payerId] += friendShareWithTax;
        }
      });
    });

    // Track payer total for stats
    const actSubtotal = act.lineItems.reduce(
      (sum, it) => sum + (Number(it.price) || 0),
      0
    );
    const actTotalWithTax = actSubtotal * taxMultiplier;
    if (totalPaidByFriend[payerId] !== undefined) {
      totalPaidByFriend[payerId] += actTotalWithTax;
    }
  });

  // Calculate Net Status for the selected user
  let othersOweMe = 0;
  let iOweOthers = 0;

  if (selectedFriendId) {
    friends.forEach((other) => {
      if (other.friendId !== selectedFriendId) {
        othersOweMe += debtGraph[other.friendId]?.[selectedFriendId] || 0;
        iOweOthers += debtGraph[selectedFriendId]?.[other.friendId] || 0;
      }
    });
  }

  const netBalance = othersOweMe - iOweOthers;

  // Resolve pairwise direct debt matrix ("Who Owes Whom")
  const settlements: SettlementDebt[] = [];
  const checkedPairs = new Set<string>();

  friends.forEach((fA) => {
    friends.forEach((fB) => {
      if (fA.friendId !== fB.friendId) {
        const pairKey = [fA.friendId, fB.friendId].sort().join("___");
        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);

          const aOwesB = debtGraph[fA.friendId]?.[fB.friendId] || 0;
          const bOwesA = debtGraph[fB.friendId]?.[fA.friendId] || 0;
          const diff = bOwesA - aOwesB;

          if (diff > 0.01) {
            // fB owes fA diff
            settlements.push({
              debtor: fB.friendName,
              debtorId: fB.friendId,
              creditor: fA.friendName,
              creditorId: fA.friendId,
              amount: diff,
            });
          } else if (diff < -0.01) {
            // fA owes fB abs(diff)
            settlements.push({
              debtor: fA.friendName,
              debtorId: fA.friendId,
              creditor: fB.friendName,
              creditorId: fB.friendId,
              amount: Math.abs(diff),
            });
          }
        }
      }
    });
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Selector Card */}
      <div className="bg-gradient-to-br from-indigo-50/90 to-slate-50 p-4 rounded-3xl border border-indigo-100/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
            {t.eventOverview}
          </span>
          <span className="text-[11px] font-semibold bg-white px-2.5 py-0.5 rounded-lg text-slate-700 border border-slate-200 shadow-2xs">
            {currentEvent.eventDate || t.eventNotSet}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.selectMyName}</span>
          </label>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">{t.chooseFriend}</option>
            {friends.map((f) => (
              <option key={f.friendId} value={f.friendId}>
                {f.friendName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* WhatsApp Summary Share Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-3xl shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm leading-tight">{t.sendSummaryBannerTitle}</h4>
              <p className="text-[10px] text-emerald-100 font-medium">
                {t.sendSummaryBannerDesc}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              const text = formatExpenseSummaryText({
                currentEvent,
                activities,
                settlements,
                language,
              });
              const res = await shareSummary({
                title: currentEvent.eventName || "Hangout Expense Summary",
                text,
              });
              if (res === "fallback") {
                setIsWhatsAppModalOpen(true);
              }
            }}
            className="flex-1 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.sendWhatsAppBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="bg-emerald-800/40 hover:bg-emerald-800/60 text-white font-medium text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer border border-white/20 shrink-0"
            title={language === "zh" ? "预览与复制" : "Preview & Copy"}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-100" />
            <span className="text-[11px] font-semibold">{language === "zh" ? "预览" : "Preview"}</span>
          </button>
        </div>
      </div>

      {/* Empty State when no friend selected */}
      {!selectedFriendId ? (
        <div className="text-center py-12 px-4 space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{t.selectNameAbovePrompt}</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {t.selectNamePromptDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">{t.myTotalConsumption}</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                ${myTotalConsumption.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {t.dishesWithTaxes}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">{t.myNetBalance}</p>
              <h3
                className={`text-xl font-extrabold mt-1 ${
                  netBalance > 0.005
                    ? "text-emerald-600"
                    : netBalance < -0.005
                    ? "text-rose-600"
                    : "text-slate-800"
                }`}
              >
                {netBalance > 0.005
                  ? `+$${netBalance.toFixed(2)}`
                  : netBalance < -0.005
                  ? `-$${Math.abs(netBalance).toFixed(2)}`
                  : "$0.00"}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {netBalance > 0.005
                  ? t.youWillReceive
                  : netBalance < -0.005
                  ? t.youNeedToPay
                  : t.allSettledUp}
              </p>
            </div>
          </div>

          {/* Section 1: Individual Consumption View */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-indigo-600" />
                <span>{t.myOrderedItems} ({myIndividualItems.length})</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {t.rawPlusTax}
              </span>
            </div>

            {myIndividualItems.length === 0 ? (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 italic">
                {t.noItemsOrdered}
              </div>
            ) : (
              <div className="space-y-2">
                {myIndividualItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {item.itemName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.activityName} •{" "}
                        <span className="text-slate-400">
                          {item.splitCount === 1
                            ? t.splitModeSingle
                            : t.splitWays.replace("{count}", String(item.splitCount))}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.rawLabel}: ${item.rawPortion.toFixed(2)} + {t.taxLabel}: $
                        {item.calculatedTaxShare.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900">
                        ${item.totalWithTax.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.paidByFriend.replace("{name}", item.payerName)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Net Balance Matrix (Who Owes Whom) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                <span>{t.netBalanceMatrix}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer"
                title={language === "zh" ? "发送账单总结至 WhatsApp" : "Send summary to WhatsApp"}
              >
                <Share2 className="w-3 h-3 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>

            {settlements.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">
                  {t.allSettledUp}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {t.noDebtsRemaining}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settlements.map((debt, index) => {
                  const isDebtor = debt.debtorId === selectedFriendId;
                  const isCreditor = debt.creditorId === selectedFriendId;
                  const isMyDebt = isDebtor || isCreditor;

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between shadow-sm ${
                        isMyDebt
                          ? isDebtor
                            ? "bg-rose-50/60 border-rose-200"
                            : "bg-emerald-50/60 border-emerald-200"
                          : "bg-white border-slate-200/90"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isDebtor
                              ? "bg-rose-100 text-rose-600"
                              : isCreditor
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isDebtor ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : isCreditor ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <ArrowLeftRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            <span
                              className={
                                isDebtor ? "text-rose-600 font-extrabold underline" : ""
                              }
                            >
                              {debt.debtor}
                            </span>{" "}
                            {t.owes}{" "}
                            <span
                              className={
                                isCreditor ? "text-emerald-600 font-extrabold underline" : ""
                              }
                            >
                              {debt.creditor}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {isDebtor
                              ? `👉 ${t.youNeedToPayThis} (${debt.creditor})`
                              : isCreditor
                              ? `💰 ${debt.debtor} ${t.owes} ${t.youAreOwedThis}`
                              : t.groupDebt}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-extrabold ${
                            isDebtor
                              ? "text-rose-600"
                              : isCreditor
                              ? "text-emerald-600"
                              : "text-slate-900"
                          }`}
                        >
                          ${debt.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Expense Summary & Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        currentEvent={currentEvent}
        friends={friends}
        activities={activities}
        settlements={settlements}
        language={language}
      />
    </div>
  );
}
