import { copyToClipboard } from "./clipboard";

/**
 * Attempts to share summary text:
 * 1. Checks if native navigator.share is supported and executes it (opens mobile share pop-up where user can pick WhatsApp & group).
 * 2. If navigator.share succeeds, returns 'shared'.
 * 3. If user cancels native share dialog (AbortError), returns 'cancelled'.
 * 4. If navigator.share fails or is not available, attempts whatsapp:// URL scheme on mobile.
 * 5. Returns 'fallback' so UI can open modal if needed.
 */
export async function shareSummary({
  title,
  text,
}: {
  title: string;
  text: string;
}): Promise<"shared" | "cancelled" | "fallback"> {
  // Always copy to clipboard as safety backup
  await copyToClipboard(text);

  // 1. Try Native Web Share API (Mobile OS Share Sheet)
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title,
        text,
      });
      return "shared";
    } catch (err: any) {
      if (err && err.name === "AbortError") {
        // User deliberately cancelled the share pop-up
        return "cancelled";
      }
      console.warn("navigator.share threw an error or was disallowed:", err);
    }
  }

  // 2. On Mobile browsers, try WhatsApp native deep link directly
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    const encoded = encodeURIComponent(text);
    const whatsappDeepLink = `whatsapp://send?text=${encoded}`;
    try {
      if (typeof window !== "undefined" && window.location) {
        window.location.href = whatsappDeepLink;
        return "shared";
      }
    } catch (e) {
      console.warn("Could not invoke whatsapp:// protocol:", e);
    }
  }

  // 3. Fallback (e.g. desktop)
  return "fallback";
}
