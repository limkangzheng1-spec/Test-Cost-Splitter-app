import { useState } from "react";
import { Activity, Friend, HangoutEvent, SettlementDebt } from "../types";
import { MessageSquare, Copy, Check, ExternalLink, X, Send, Share2 } from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";
import { Language, translations } from "../utils/i18n";
import { formatExpenseSummaryText, HARDCODED_GAS_URL } from "../utils/summaryFormatter";
import { shareSummary } from "../utils/shareUtils";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: HangoutEvent;
  friends: Friend[];
  activities: Activity[];
  settlements: SettlementDebt[];
  language?: Language;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  currentEvent,
  friends,
  activities,
  settlements,
  language = "en",
}: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const t = translations[language] || translations.en;

  if (!isOpen) return null;

  const messageText = formatExpenseSummaryText({
    currentEvent,
    activities,
    settlements,
    language,
  });

  const handleCopy = async () => {
    const ok = await copyToClipboard(messageText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await copyToClipboard(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const res = await shareSummary({
      title: currentEvent.eventName || "Hangout Expense Summary",
      text: messageText,
    });

    if (res === "shared" || res === "cancelled") {
      return;
    }

    // Desktop or Web fallback
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {t.whatsAppModalTitle}
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                {t.whatsAppModalDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* WhatsApp Message Preview Bubble */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.messagePreview}</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {t.readyToSend}
              </span>
            </div>

            <div className="bg-[#EFEAE2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
              <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-emerald-900/5 select-text">
                {messageText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleCopy}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">{t.copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>{t.copyMessageText}</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleShareClick}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer no-underline text-center"
          >
            <Send className="w-4 h-4" />
            <span>{t.shareToWhatsApp}</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
          </a>
        </div>

      </div>
    </div>
  );
}

