import { useState } from "react";
import { Copy, Check, X, FileCode, Database, Sparkles, BookOpen } from "lucide-react";
import { copyToClipboard as copyText } from "../utils/clipboard";
import { Language } from "../utils/i18n";

interface GasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export function GasExportModal({ isOpen, onClose, language = "en" }: GasExportModalProps) {
  const [activeTab, setActiveTab] = useState<"guide" | "code_gs" | "index_html">("guide");
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);

  if (!isOpen) return null;

  const isZh = language === "zh";

  const handleCopy = async (text: string, type: "gs" | "html") => {
    await copyText(text);
    if (type === "gs") {
      setCopiedCodeGs(true);
      setTimeout(() => setCopiedCodeGs(false), 2000);
    } else {
      setCopiedIndexHtml(true);
      setTimeout(() => setCopiedIndexHtml(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isZh ? "Google Apps Script & 表格部署交付文件" : "Google Apps Script & Sheets Deliverables"}
              </h2>
              <p className="text-xs text-slate-500">
                {isZh
                  ? "适用于 Google Sheets 云端数据库与 Apps Script Web App 的生产代码"
                  : "Production-ready code for Google Sheets database + Apps Script Web App"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("guide")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "guide"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isZh ? "配置说明 (3分钟)" : "Setup Guide (3 Mins)"}</span>
          </button>

          <button
            onClick={() => setActiveTab("code_gs")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "code_gs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isZh ? "Code.gs (后端脚本)" : "Code.gs (Backend)"}</span>
          </button>

          <button
            onClick={() => setActiveTab("index_html")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "index_html"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isZh ? "Index.html (前端 SPA)" : "Index.html (Frontend SPA)"}</span>
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700 leading-relaxed">
          
          {/* TAB 1: GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>
                    {isZh ? "4 步部署至 Google 表格指南：" : "How to Deploy on Google Sheets in 4 Steps:"}
                  </span>
                </h3>
                <p className="text-indigo-900">
                  {isZh
                    ? "本项目将 Google Sheets 作为持久化关系数据库，并通过 Google Apps Script (GAS) 托管带有服务端 Gemini OCR 识别能力的手机网页端应用。"
                    : "This application uses a Google Sheet as its persistent relational database and Google Apps Script (GAS) to host the mobile SPA with server-side Gemini OCR."}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>{isZh ? "创建新的 Google 表格" : "Create a new Google Sheet"}</span>
                  </h4>
                  <p className="text-slate-600 pl-6">
                    {isZh ? (
                      <>打开 <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">sheets.new</a>。无需手动创建工作表分卷，<code>Code.gs</code> 会在初次运行时自动初始化生成 4 个数据表 (<code>Events</code>, <code>Friends</code>, <code>Activities</code>, <code>LineItems</code>)。</>
                    ) : (
                      <>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">sheets.new</a>. You do not need to create tabs manually; <code>Code.gs</code> will auto-create the 4 tabs (<code>Events</code>, <code>Friends</code>, <code>Activities</code>, <code>LineItems</code>) on first launch!</>
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>{isZh ? "打开 Apps 脚本编辑器" : "Open Apps Script Editor"}</span>
                  </h4>
                  <p className="text-slate-600 pl-6">
                    {isZh ? (
                      <>在 Google 表格菜单栏中，点击 <strong>扩展程序 (Extensions)</strong> &gt; <strong>Apps 脚本 (Apps Script)</strong>。</>
                    ) : (
                      <>In your Google Sheet, click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</>
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>{isZh ? "粘贴 `Code.gs` 与 `Index.html`" : "Paste `Code.gs` and `Index.html`"}</span>
                  </h4>
                  <p className="text-slate-600 pl-6">
                    {isZh ? (
                      <>- 将 <code>Code.gs</code> 的内容替换为上方 <strong>Code.gs 选项卡</strong> 中的代码。<br />- 点击 <strong>+ (添加文件)</strong> 按钮，选择 <strong>HTML</strong>，命名为 <code>Index</code>（或 <code>Index.html</code>），然后粘贴上方 <strong>Index.html 选项卡</strong> 中的代码。</>
                    ) : (
                      <>- Replace the contents of <code>Code.gs</code> with the code in the <strong>Code.gs tab</strong> above.<br />- Click the <strong>+ (Add a file)</strong> button, choose <strong>HTML</strong>, name it <code>Index</code> (or <code>Index.html</code>), and paste the code from the <strong>Index.html tab</strong> above.</>
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>{isZh ? "配置 Gemini API Key 并部署" : "Set Gemini API Key & Deploy"}</span>
                  </h4>
                  <p className="text-slate-600 pl-6">
                    {isZh ? (
                      <>- 点击 <strong>项目设置 (齿轮图标)</strong> &gt; <strong>脚本属性</strong>，添加属性 <code>GEMINI_API_KEY</code>。<br />- 点击 <strong>部署</strong> &gt; <strong>新建部署</strong> (或编辑现有部署为 <strong>新版本</strong>) &gt; 网页应用。<br />- 设置 <em>执行身份</em>: <strong>我 (Me)</strong>，<em>访问权限</em>: <strong>任何人 (Anyone)</strong>。<br />- 点击 <strong>部署</strong>，即可在手机或电脑浏览器中直接打开使用！</>
                    ) : (
                      <>- Under <strong>Project Settings (Gear Icon)</strong> &gt; <strong>Script Properties</strong>, add property <code>GEMINI_API_KEY</code> with your API key from Google AI Studio.<br />- Click <strong>Deploy</strong> &gt; <strong>New deployment</strong> (or edit existing deployment to <strong>New version</strong>) &gt; Web app.<br />- Set <em>Execute as</em>: <strong>Me</strong> and <em>Who has access</em>: <strong>Anyone</strong>.<br />- Click <strong>Deploy</strong> and open the URL on your mobile phone!</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE.GS */}
          {activeTab === "code_gs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">File: Code.gs</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {isZh ? "优先 gemini-3.1-flash-lite + 毒舌吐槽" : "Prioritize gemini-3.1-flash-lite + Roast"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    fetch("/Code.gs?v=" + Date.now(), { cache: "no-store" })
                      .then((r) => r.text())
                      .then((txt) => handleCopy(txt, "gs"));
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition text-xs active:scale-95 cursor-pointer"
                >
                  {copiedCodeGs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeGs ? (isZh ? "已复制最新版！" : "Copied Latest!") : (isZh ? "复制 Code.gs" : "Copy Code.gs")}</span>
                </button>
              </div>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed">
                <p className="text-slate-400">// Code.gs is saved in your project root at /Code.gs & /public/Code.gs</p>
                <p className="text-slate-400">// Includes: Active Gemini 3.x series models (gemini-3.5-flash, gemini-3.8-flash),</p>
                <p className="text-slate-400">// Smart Receipt Guard: Automatically detects & rejects non-receipt images (faces, trees, food plates without bills),</p>
                <p className="text-slate-400">// and full CRUD with Drive receipts and Google Sheets net-debt sync.</p>
                <br />
                <p className="text-emerald-400 font-bold">
                  {isZh
                    ? '点击上方 "复制 Code.gs" 即可将具备智能识别防误拍的最新代码直接复制到剪贴板！'
                    : 'Click "Copy Code.gs" above to copy the latest code with Smart Receipt Guard to your clipboard!'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INDEX.HTML */}
          {activeTab === "index_html" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">File: Index.html (for GAS)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {isZh ? "最新版本 (含「付钱的老板」)" : "Updated (Payer Terminology)"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    fetch("/gas_Index.html?v=" + Date.now(), { cache: "no-store" })
                      .then((r) => r.text())
                      .then((txt) => handleCopy(txt, "html"));
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition text-xs active:scale-95 cursor-pointer"
                >
                  {copiedIndexHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndexHtml ? (isZh ? "已复制最新版！" : "Copied Latest!") : (isZh ? "复制 Index.html" : "Copy Index.html")}</span>
                </button>
              </div>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed">
                <p className="text-slate-400">&lt;!-- Index.html is saved at /gas_Index.html & /public/gas_Index.html --&gt;</p>
                <p className="text-slate-400">&lt;!-- Single-Page Application styled with Tailwind CSS via CDN --&gt;</p>
                <p className="text-slate-400">&lt;!-- Contains: 付钱的老板 terminology, Direct Admin, Saving Buffer Modal, Bilingual UI --&gt;</p>
                <br />
                <p className="text-emerald-400 font-bold">
                  {isZh
                    ? '点击上方 "复制 Index.html" 即可将最新前端代码复制到剪贴板！'
                    : 'Click "Copy Index.html" above to copy the latest standalone frontend directly to your clipboard!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            {isZh ? "关闭" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
