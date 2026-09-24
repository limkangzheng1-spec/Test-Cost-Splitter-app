import { Activity, HangoutEvent, SettlementDebt } from "../types";
import { Language } from "./i18n";

export const HARDCODED_GAS_URL =
  "https://script.google.com/macros/s/AKfycbzv4PUNq7QbQTYGE7iyvN0-jqF8Slw6gsVxL0Juxv3ctVmbUebFEAYQuSSAsN5XBnge/exec";

export function getShareableAppUrl(eventId?: string): string {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return eventId ? `${origin}/?event=${encodeURIComponent(eventId)}` : origin;
    }
  }
  return HARDCODED_GAS_URL;
}

export function formatExpenseSummaryText({
  currentEvent,
  activities,
  settlements,
  language = "en",
}: {
  currentEvent: HangoutEvent;
  activities: Activity[];
  settlements: SettlementDebt[];
  language?: Language;
}): string {
  let grandTotal = 0;
  activities.forEach((act) => {
    const taxMultiplier =
      1 +
      (Number(act.sstPercent || 0) / 100) +
      (Number(act.serviceTaxPercent || 0) / 100);

    let actSubtotal = 0;
    (act.lineItems || []).forEach((item) => {
      actSubtotal += Number(item.price) || 0;
    });

    grandTotal += actSubtotal * taxMultiplier;
  });

  const lines: string[] = [];

  if (language === "zh") {
    lines.push(`🎉 *${currentEvent.eventName || "聚会"} - 分账结算总结* 📊`);
    if (currentEvent.eventDate) {
      lines.push(`📅 *日期:* ${currentEvent.eventDate}`);
    }
    lines.push(
      `💰 *聚会总支出:* $${grandTotal.toFixed(2)} (${activities.length} 笔消费)`
    );
    lines.push(``);

    lines.push(`👥 *谁该转账给谁 (结清明细):*`);
    if (settlements.length === 0) {
      lines.push(`✅ 账单已全部结清！无未付欠款。`);
    } else {
      settlements.forEach((s) => {
        lines.push(
          `• *${s.debtor}* 需转账给 *${s.creditor}*: $${s.amount.toFixed(2)}`
        );
      });
    }
    lines.push(``);
    lines.push(`👉 *打开网页应用查看个人消费与收据详情:*`);
    lines.push(getShareableAppUrl(currentEvent.eventId));
  } else {
    lines.push(`🎉 *${currentEvent.eventName || "Hangout"} - Expense Summary* 📊`);
    if (currentEvent.eventDate) {
      lines.push(`📅 *Date:* ${currentEvent.eventDate}`);
    }
    lines.push(
      `💰 *Total Spent:* $${grandTotal.toFixed(2)} (${activities.length} ${
        activities.length === 1 ? "activity" : "activities"
      })`
    );
    lines.push(``);

    lines.push(`👥 *Who Owes Whom (Settlements):*`);
    if (settlements.length === 0) {
      lines.push(`✅ Everyone is settled up! No outstanding debts.`);
    } else {
      settlements.forEach((s) => {
        lines.push(
          `• *${s.debtor}* owes *${s.creditor}*: $${s.amount.toFixed(2)}`
        );
      });
    }
    lines.push(``);
    lines.push(`👉 *Access cost split application to view more details:*`);
    lines.push(getShareableAppUrl(currentEvent.eventId));
  }

  return lines.join("\n");
}
