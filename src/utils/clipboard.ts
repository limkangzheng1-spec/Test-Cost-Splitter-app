/**
 * Robust clipboard copy helper with fallback for iframe sandboxes
 * and environments where `navigator.clipboard.writeText` throws
 * "Document is not focused" or permission errors.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern async clipboard API only if document has focus
  if (document.hasFocus() && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText threw error, attempting fallback:", err);
    }
  }

  // 2. Universal fallback using textarea and document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn("Fallback clipboard copy failed:", err);
    return false;
  }
}
