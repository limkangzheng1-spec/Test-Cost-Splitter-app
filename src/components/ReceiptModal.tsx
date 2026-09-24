import { useState } from "react";
import { X, ExternalLink, ZoomIn, ZoomOut, Receipt } from "lucide-react";
import { Language } from "../utils/i18n";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  language?: Language;
}

export function ReceiptModal({ isOpen, onClose, imageUrl, title, language = "en" }: ReceiptModalProps) {
  const [scale, setScale] = useState(1);

  if (!isOpen || !imageUrl) return null;

  const isZh = language === "zh";
  const isDriveUrl = imageUrl.includes("drive.google.com") || imageUrl.includes("googleusercontent.com");

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Header bar */}
      <div className="w-full max-w-xl flex items-center justify-between px-3 py-2 text-white mb-2 z-10">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-xs sm:text-sm truncate">
              {title || (isZh ? "收据图片" : "Receipt Image")}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isZh ? "Google Drive 与相机原图存储" : "Google Drive & Camera Source"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={handleZoomOut}
              title={isZh ? "缩小" : "Zoom Out"}
              className="p-1 hover:bg-white/20 rounded-lg text-slate-200 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title={isZh ? "重置缩放" : "Reset Zoom"}
              className="px-1.5 py-0.5 text-[10px] font-mono hover:bg-white/20 rounded text-slate-300 cursor-pointer"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              title={isZh ? "放大" : "Zoom In"}
              className="p-1 hover:bg-white/20 rounded-lg text-slate-200 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {isDriveUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title={isZh ? "直接在 Google 云端硬盘中查看" : "Open directly in Google Drive"}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline font-bold">Drive</span>
            </a>
          )}

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
            title={isZh ? "关闭" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image viewport */}
      <div className="relative w-full max-w-xl flex-1 bg-slate-950/60 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center p-2">
        <div className="overflow-auto max-h-[75vh] w-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title || (isZh ? "收据图片" : "Receipt")}
            style={{ transform: `scale(${scale})`, transition: "transform 0.15s ease" }}
            className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl origin-center"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
