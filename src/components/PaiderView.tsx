import { useState, useRef } from "react";
import { Activity, Friend, HangoutEvent, LineItem } from "../types";
import {
  Plus,
  Receipt,
  Camera,
  Upload,
  Eye,
  CheckCircle2,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  Users,
  User,
  CheckSquare,
  Percent,
  X,
  ArrowRight,
  Utensils,
  Image as ImageIcon,
  CloudUpload,
  Check,
  AlertTriangle,
} from "lucide-react";
import { ReceiptModal } from "./ReceiptModal";
import { Language, translations } from "../utils/i18n";

interface PaiderViewProps {
  currentEvent: HangoutEvent;
  friends: Friend[];
  activities: Activity[];
  onSaveActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
  onSwitchEvent: () => void;
  language?: Language;
}

export function PaiderView({
  currentEvent,
  friends,
  activities,
  onSaveActivity,
  onDeleteActivity,
  onSwitchEvent,
  language = "en",
}: PaiderViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState("");
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState<number>(1);
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; title: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language] || translations.en;

  // Active editing session
  const [editingActivity, setEditingActivity] = useState<Activity>({
    activityId: "",
    eventId: currentEvent.eventId,
    activityName: "",
    paidByFriendId: friends[0]?.friendId || "",
    sstPercent: 6,
    serviceTaxPercent: 10,
    lineItems: [],
  });

  const openNewActivity = () => {
    if (friends.length === 0) {
      alert(t.alertAddFriendsFirst);
      return;
    }
    setScanWarning(null);
    setEditingActivity({
      activityId: "",
      eventId: currentEvent.eventId,
      activityName: "",
      paidByFriendId: friends[0]?.friendId || "",
      sstPercent: 6,
      serviceTaxPercent: 10,
      lineItems: [
        {
          itemId: `ITM_${Date.now()}`,
          itemName: "",
          price: 0,
          assignedFriends: "ALL",
        },
      ],
    });
    setIsModalOpen(true);
  };

  const openEditActivity = (act: Activity) => {
    setScanWarning(null);
    setEditingActivity(JSON.parse(JSON.stringify(act)));
    setIsModalOpen(true);
  };

  // Add line item manually
  const handleAddLineItem = () => {
    setEditingActivity((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          itemId: `ITM_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          itemName: "",
          price: 0,
          assignedFriends: "ALL",
        },
      ],
    }));
  };

  // Delete line item
  const handleRemoveLineItem = (index: number) => {
    setEditingActivity((prev) => {
      const items = [...prev.lineItems];
      items.splice(index, 1);
      return { ...prev, lineItems: items };
    });
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof LineItem, val: any) => {
    setEditingActivity((prev) => {
      const items = [...prev.lineItems];
      items[index] = { ...items[index], [field]: val };
      return { ...prev, lineItems: items };
    });
  };

  // Toggle friend in Custom Multi-Select Checkboxes
  const handleToggleCustomFriend = (itemIndex: number, friendId: string) => {
    setEditingActivity((prev) => {
      const items = [...prev.lineItems];
      const it = items[itemIndex];
      let currentArray: string[] = [];

      if (it.assignedFriends === "ALL") {
        currentArray = friends.map((f) => f.friendId);
      } else {
        currentArray = it.assignedFriends.split(",").filter(Boolean);
      }

      if (currentArray.includes(friendId)) {
        currentArray = currentArray.filter((id) => id !== friendId);
      } else {
        currentArray.push(friendId);
      }

      if (currentArray.length === 0) {
        currentArray = [friendId];
      }

      items[itemIndex] = {
        ...it,
        assignedFriends: currentArray.join(","),
      };
      return { ...prev, lineItems: items };
    });
  };

  // Camera Receipt Scanner with client-side image downscaling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatusText(t.scanStatusOptimizing);

    const compressImage = (fileToCompress: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxDimension = 1600;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.onerror = () => resolve(event.target?.result as string);
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(fileToCompress);
      });
    };

    try {
      const base64Data = await compressImage(file);
      if (!base64Data) {
        setIsScanning(false);
        return;
      }

      // Attach compressed receipt image directly to the activity for viewing & persistence
      setEditingActivity((prev) => ({
        ...prev,
        receiptImageUrl: base64Data,
      }));

      setScanStatusText(t.scanStatusReading);

      try {
        const res = await fetch("/api/gemini/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: "image/jpeg",
          }),
        });

        const data = await res.json();

        // 1. Smart Receipt Guard: Image is NOT a receipt (e.g. human face, tree, animal, cat, food without bill)
        if (data.success && data.isReceipt === false) {
          const detected = data.detectedSubject || (language === "zh" ? "非小票内容" : "non-receipt object");
          const defaultMsg = data.rejectMessage || (
            language === "zh"
              ? `🤨 喂！你上传的是「${detected}」吧？！这玩意儿可不能用来 AA 结账！猫猫/自拍可不会替大家掏钱，快去拍真正的账单小票！`
              : `🤨 Bruh, what the hell are you uploading?! This is literally "${detected}", not a receipt! Your ${detected} ain't paying for dinner. Snap the real bill!`
          );
          setScanWarning(defaultMsg);
          setIsScanning(false);
          setScanStatusText("");
          return;
        }

        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          setScanWarning(null);
          const newItems: LineItem[] = data.items.map((it: any, idx: number) => ({
            itemId: `ITM_${Date.now()}_${idx}`,
            itemName: it.item || "Receipt Item",
            price: Number(it.price) || 0,
            assignedFriends: "ALL",
          }));

          setEditingActivity((prev) => ({
            ...prev,
            receiptImageUrl: base64Data,
            lineItems: [...prev.lineItems.filter((i) => i.itemName.trim() !== ""), ...newItems],
          }));
        } else if (data.success && (!data.items || data.items.length === 0)) {
          setScanWarning(
            language === "zh"
              ? "未在小票中识别出具体菜品与价格项目，请手动添加或换个角度重试。"
              : "No line items or prices detected on receipt. Please add manually or take another photo."
          );
        } else {
          // If error returned from server
          setScanWarning(data.error || (language === "zh" ? "识别服务暂时繁忙，请稍后再试" : "Receipt scan service busy. Please try again."));
        }
      } catch (fetchErr) {
        console.error("API receipt scan failed, applying demo items", fetchErr);
        applySimulatedScanItems();
      } finally {
        setIsScanning(false);
        setScanStatusText("");
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (galleryInputRef.current) galleryInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      setScanStatusText("");
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const applySimulatedScanItems = () => {
    const mockItems: LineItem[] = language === "zh" ? [
      { itemId: `ITM_${Date.now()}_1`, itemName: "招牌顶级牛排", price: 68.0, assignedFriends: "ALL" },
      { itemId: `ITM_${Date.now()}_2`, itemName: "松露薯条 (全桌平摊)", price: 18.5, assignedFriends: "ALL" },
      { itemId: `ITM_${Date.now()}_3`, itemName: "精酿啤酒 x3", price: 42.0, assignedFriends: friends.slice(0, 3).map(f => f.friendId).join(",") || "ALL" },
    ] : [
      { itemId: `ITM_${Date.now()}_1`, itemName: "Signature Ribeye Steak", price: 68.0, assignedFriends: "ALL" },
      { itemId: `ITM_${Date.now()}_2`, itemName: "Truffle Fries (Sharing)", price: 18.5, assignedFriends: "ALL" },
      { itemId: `ITM_${Date.now()}_3`, itemName: "Craft Draft Beer x3", price: 42.0, assignedFriends: friends.slice(0, 3).map(f => f.friendId).join(",") || "ALL" },
    ];
    setEditingActivity((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems.filter((i) => i.itemName.trim() !== ""), ...mockItems],
    }));
  };

  // Calculations for preview box
  const itemsSubtotal = editingActivity.lineItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0),
    0
  );
  const taxMultiplier =
    1 +
    (Number(editingActivity.sstPercent || 0) / 100) +
    (Number(editingActivity.serviceTaxPercent || 0) / 100);
  const grandTotalWithTax = itemsSubtotal * taxMultiplier;

  const handleSave = async () => {
    if (!editingActivity.activityName.trim()) {
      alert(t.alertEnterVenueName);
      return;
    }
    if (!editingActivity.paidByFriendId) {
      alert(t.alertSelectWhoPaid);
      return;
    }
    if (editingActivity.lineItems.length === 0) {
      alert(t.alertAddLineItem);
      return;
    }

    const activityToSave: Activity = {
      ...editingActivity,
      activityId: editingActivity.activityId || `ACT_${Date.now()}`,
      eventId: currentEvent.eventId,
      sstPercent: Number(editingActivity.sstPercent) || 0,
      serviceTaxPercent: Number(editingActivity.serviceTaxPercent) || 0,
      lineItems: editingActivity.lineItems.map((it) => ({
        ...it,
        price: Number(it.price) || 0,
        itemName: it.itemName.trim() || "Item",
      })),
    };

    if (editingActivity.receiptImageUrl) {
      setIsSaving(true);
      setSavingStep(1);
      await new Promise((r) => setTimeout(r, 1200));
      setSavingStep(2);
      await new Promise((r) => setTimeout(r, 1600));
      setSavingStep(3);
      await new Promise((r) => setTimeout(r, 1200));
      setIsSaving(false);
    }

    onSaveActivity(activityToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Event Header Card */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">
            {t.activeHangout}
          </span>
          <h2 className="font-extrabold text-base leading-tight mt-0.5">
            {currentEvent.eventName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.eventDatePrefix}: {currentEvent.eventDate || t.today} • {friends.length} {t.attendeesCount}
          </p>
        </div>
        <button
          onClick={onSwitchEvent}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition"
        >
          {t.switchBtn}
        </button>
      </div>

      {/* Activity List Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-bold text-sm text-slate-900">{t.hangoutSessions}</h3>
          <p className="text-[11px] text-slate-500">
            {t.sessionsSubheader}
          </p>
        </div>
        <button
          onClick={openNewActivity}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addSessionBtn}</span>
        </button>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">{t.noSessionsYet}</h4>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => {
            const payer = friends.find((f) => f.friendId === act.paidByFriendId);
            const payerName = payer ? payer.friendName : "Unknown";
            const subtotal = act.lineItems.reduce(
              (sum, it) => sum + (Number(it.price) || 0),
              0
            );
            const actTaxMult =
              1 +
              (Number(act.sstPercent || 0) / 100) +
              (Number(act.serviceTaxPercent || 0) / 100);
            const actTotal = subtotal * actTaxMult;

            return (
              <div
                key={act.activityId}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-indigo-600" />
                      <span>{act.activityName}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.paidBy}:{" "}
                      <span className="font-bold text-slate-800">{payerName}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">
                      ${actTotal.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {act.sstPercent}% {language === "zh" ? "销售税" : "SST"} + {act.serviceTaxPercent}% {language === "zh" ? "服务税" : "Serv"}
                    </p>
                  </div>
                </div>

                {/* Mini Line Item Chips */}
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-xs">
                  {act.lineItems.slice(0, 3).map((it) => (
                    <div key={it.itemId} className="flex justify-between text-slate-600">
                      <span className="truncate max-w-[200px]">{it.itemName}</span>
                      <span className="font-semibold text-slate-800">
                        ${Number(it.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {act.lineItems.length > 3 && (
                    <p className="text-[10px] text-slate-400 text-center pt-0.5 italic">
                      + {act.lineItems.length - 3} {t.itemsCount}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {act.receiptImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingReceipt({
                          url: act.receiptImageUrl!,
                          title: act.activityName,
                        })
                      }
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.viewReceipt}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`${t.confirmDeleteSession} "${act.activityName}"?`)) {
                        onDeleteActivity(act.activityId);
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.delete}</span>
                  </button>

                  <button
                    onClick={() => openEditActivity(act)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.editSessionBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* ACTIVITY DETAIL & ITEM ENTRY MODAL (CRITICAL REQUIREMENTS)    */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200">
            {/* Modal Top Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isSaving
                    ? t.savingSessionBufferTitle
                    : (editingActivity.activityId ? t.editSessionModalTitle : t.addSessionModalTitle)}
                </h3>
                <p className="text-xs text-slate-500">
                  {isSaving
                    ? (editingActivity.receiptImageUrl ? t.savingSessionReceiptDesc : t.savingSessionNormalDesc)
                    : t.sessionModalDesc}
                </p>
              </div>
              {!isSaving && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Content: Buffer Animation vs Form */}
            {isSaving ? (
              <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 flex-1 animate-in fade-in duration-300">
                <div className="relative my-3">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center shadow-lg shadow-indigo-100">
                    <CloudUpload className="w-10 h-10 text-indigo-600 animate-bounce" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <h4 className="font-extrabold text-base text-slate-900">
                    {t.savingSessionBufferTitle}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t.savingSessionReceiptDesc}
                  </p>
                </div>

                {/* Multi-Step Saving Checklist */}
                <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-left text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {language === "zh" ? "收据图片优化与压缩" : "Receipt Photo Compression"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {language === "zh" ? "高保真画质压缩已完成" : "High-fidelity optimization completed"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        savingStep > 2
                          ? "bg-emerald-100 text-emerald-700"
                          : savingStep === 2
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {savingStep > 2 ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : savingStep === 2 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="text-[11px] font-bold">2</span>
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          savingStep >= 2 ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {language === "zh"
                          ? "上传原图至 Google Drive 云端硬盘 (~10s)"
                          : "Uploading Receipt to Google Drive (~10s)"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {savingStep > 2
                          ? (language === "zh" ? "云端存储链接已生成" : "Drive cloud link generated")
                          : savingStep === 2
                          ? (language === "zh" ? "正在与 Google Drive 通信传输中..." : "Transferring data to Drive storage...")
                          : (language === "zh" ? "等待上传" : "Pending upload")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        savingStep === 3
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {savingStep === 3 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="text-[11px] font-bold">3</span>
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          savingStep === 3 ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {language === "zh"
                          ? "计算好友税费分摊与保存至 Google 表格"
                          : "Allocating Taxes & Syncing Session"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {savingStep === 3
                          ? (language === "zh" ? "正在更新结算矩阵..." : "Updating net debt matrix...")
                          : (language === "zh" ? "准备写入记录" : "Ready to write record")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                  <span>{t.savingSessionBufferNotice}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  {/* Session / Place Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.placeNameLabel}
                    </label>
                    <input
                      type="text"
                      value={editingActivity.activityName}
                      onChange={(e) =>
                        setEditingActivity((prev) => ({ ...prev, activityName: e.target.value }))
                      }
                      placeholder={t.placeNamePlaceholder}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Who Paid Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.whoPaidLabel}
                    </label>
                    <select
                      value={editingActivity.paidByFriendId}
                      onChange={(e) =>
                        setEditingActivity((prev) => ({
                          ...prev,
                          paidByFriendId: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {friends.map((f) => (
                        <option key={f.friendId} value={f.friendId}>
                          {f.friendName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Taxes Rules: SST% & ServiceTax% */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t.sstTaxLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={editingActivity.sstPercent}
                          onChange={(e) =>
                            setEditingActivity((prev) => ({
                              ...prev,
                              sstPercent: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t.serviceTaxLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={editingActivity.serviceTaxPercent}
                          onChange={(e) =>
                            setEditingActivity((prev) => ({
                              ...prev,
                              serviceTaxPercent: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                      </div>
                    </div>
                  </div>

                  {/* LINE ITEMS SECTION */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {t.lineItemsHeader} ({editingActivity.lineItems.length})
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Camera Capture Input */}
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {/* Storage / Gallery Upload Input */}
                        <input
                          ref={galleryInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {/* Camera AI Scan Button */}
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95"
                          title={language === "zh" ? "使用手机拍照扫描收据" : "Take receipt photo with phone camera"}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{t.cameraBtn}</span>
                        </button>

                        {/* Phone Storage / Gallery Upload Button */}
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95"
                          title={language === "zh" ? "从手机相册或文件中上传收据" : "Upload receipt photo from phone album or files"}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t.uploadBtn}</span>
                        </button>

                        {/* Quick Demo Scan Button */}
                        <button
                          type="button"
                          onClick={applySimulatedScanItems}
                          title={language === "zh" ? "快捷测试模拟小票" : "Quick test with simulated receipt"}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1.5 rounded-xl flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{t.demoScanBtn}</span>
                        </button>

                        {/* Manual Add Line Item */}
                        <button
                          type="button"
                          onClick={handleAddLineItem}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.addItemBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* Smart Receipt Guard Rejection Warning / Roast Card */}
                    {scanWarning && (
                      <div className="mb-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-950 rounded-2xl p-3.5 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in duration-200">
                        <span className="text-2xl select-none leading-none mt-0.5">🤨</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[12px] text-amber-900 tracking-tight flex items-center gap-1.5">
                              <span>HOLD UP BRO...</span>
                              <span className="text-[9px] uppercase font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">Not A Receipt</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setScanWarning(null)}
                              className="text-amber-600 hover:text-amber-900 p-0.5 rounded-lg transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="font-semibold text-slate-800 leading-relaxed text-xs">{scanWarning}</p>
                        </div>
                      </div>
                    )}

                    {/* Attached Receipt Thumbnail & Viewer Preview */}
                    {editingActivity.receiptImageUrl && (
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between mb-3 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={editingActivity.receiptImageUrl}
                            alt={language === "zh" ? "已上传收据" : "Attached Receipt"}
                            className="w-10 h-10 object-cover rounded-xl border border-emerald-300 shadow-2xs"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-900">{t.receiptAttached}</span>
                            </div>
                            <p className="text-[10px] text-emerald-700">{t.storedToDrive}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingReceipt({
                                url: editingActivity.receiptImageUrl!,
                                title: editingActivity.activityName || (language === "zh" ? "已附小票" : "Attached Receipt"),
                              })
                            }
                            className="text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition shadow-2xs"
                          >
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>{t.viewBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingActivity((prev) => ({ ...prev, receiptImageUrl: undefined }))
                            }
                            className="text-[11px] text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition"
                            title={language === "zh" ? "移除已附收据" : "Remove attached receipt"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Camera/Upload AI scanning indicator */}
                    {isScanning && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-center gap-2 mb-3 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>{scanStatusText || t.scanStatusReading}</span>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-3">
                      {editingActivity.lineItems.map((item, idx) => {
                        let splitMode: "ALL" | "SPECIFIC" | "CUSTOM" = "ALL";
                        if (item.assignedFriends === "ALL") {
                          splitMode = "ALL";
                        } else if (!item.assignedFriends.includes(",")) {
                          splitMode = "SPECIFIC";
                        } else {
                          splitMode = "CUSTOM";
                        }

                        return (
                          <div
                            key={item.itemId || idx}
                            className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2.5 shadow-sm"
                          >
                            {/* Name and Price Row */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.itemName}
                                onChange={(e) =>
                                  handleUpdateItem(idx, "itemName", e.target.value)
                                }
                                placeholder={t.dishPlaceholder}
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="relative w-24">
                                <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      idx,
                                      "price",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  placeholder="0.00"
                                  className="w-full bg-white border border-slate-300 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold text-slate-900 text-right focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title={language === "zh" ? "删除餐品" : "Remove item"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Granular Split Assignment Selector */}
                            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {t.splitAssignment}
                                </span>
                              </div>

                              {/* 3 Split Option Buttons */}
                              <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItem(idx, "assignedFriends", "ALL")}
                                  className={`py-1 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                                    splitMode === "ALL"
                                      ? "bg-white text-indigo-700 shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{t.everyone}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstFriend = friends[0]?.friendId || "ALL";
                                    handleUpdateItem(idx, "assignedFriends", firstFriend);
                                  }}
                                  className={`py-1 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                                    splitMode === "SPECIFIC"
                                      ? "bg-white text-indigo-700 shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <User className="w-3 h-3" />
                                  <span>{t.oneFriend}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const allFriendsStr = friends.map((f) => f.friendId).join(",");
                                    handleUpdateItem(idx, "assignedFriends", allFriendsStr);
                                  }}
                                  className={`py-1 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                                    splitMode === "CUSTOM"
                                      ? "bg-white text-indigo-700 shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>{t.custom}</span>
                                </button>
                              </div>

                              {/* Sub-UI for Option 2: Specific Friend Dropdown */}
                              {splitMode === "SPECIFIC" && (
                                <div className="pt-1">
                                  <select
                                    value={item.assignedFriends}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, "assignedFriends", e.target.value)
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                                  >
                                    {friends.map((f) => (
                                      <option key={f.friendId} value={f.friendId}>
                                        {f.friendName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Sub-UI for Option 3: Custom Checkboxes */}
                              {splitMode === "CUSTOM" && (
                                <div className="pt-1 grid grid-cols-2 gap-1.5 bg-white p-2 rounded-xl border border-slate-200">
                                  {friends.map((f) => {
                                    const checked = (item.assignedFriends || "")
                                      .split(",")
                                      .includes(f.friendId);
                                    return (
                                      <label
                                        key={f.friendId}
                                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() =>
                                            handleToggleCustomFriend(idx, f.friendId)
                                          }
                                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                        />
                                        <span className="truncate">{f.friendName}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total Preview Summary Box */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1.5 shadow-inner">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t.itemsSubtotal}</span>
                      <span className="font-semibold text-white">
                        ${itemsSubtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{t.taxMultiplier}</span>
                      <span className="font-semibold text-white">
                        {taxMultiplier.toFixed(2)}x (+
                        {((taxMultiplier - 1) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-800">
                      <span>{t.totalWithTaxes}</span>
                      <span className="text-indigo-400 font-extrabold text-base">
                        ${grandTotalWithTax.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50 transition"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-100 transition active:scale-95"
                  >
                    {t.saveSessionBtn}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      <ReceiptModal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        imageUrl={viewingReceipt?.url || ""}
        title={viewingReceipt?.title || "Receipt"}
        language={language}
      />
    </div>
  );
}
