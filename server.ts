import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Lazy initialization of Gemini client
let genAI: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Helper function: Parse raw receipt OCR text lines to structured items
function parseReceiptTextToItems(rawText: string) {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: Array<{ item: string; price: number }> = [];

  const ignoreKeywords = [
    "subtotal", "sub-total", "sub total", "grand total", "total amount", "total",
    "balance due", "balance", "cash tendered", "cash", "change due", "change",
    "rounding", "round", "visa", "mastercard", "amex", "debit", "credit card",
    "card no", "approved", "invoice", "receipt", "tax invoice", "bill no",
    "table no", "table", "guest", "pax", "server", "cashier", "counter",
    "sst", "gst", "vat", "service charge", "svc charge", "svc tax", "tips",
    "discount", "disc", "voucher", "order id", "order #", "trans #", "tel:",
    "phone", "thank you", "welcome", "date:", "time:", "closed", "copy",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const shouldSkip = ignoreKeywords.some((kw) => {
      if (lower.includes(kw)) {
        return (
          lower.includes("subtotal") || lower.includes("total") ||
          lower.includes("sst") || lower.includes("service charge") ||
          lower.includes("cash") || lower.includes("change") ||
          lower.includes("rounding")
        );
      }
      return false;
    });
    if (shouldSkip) continue;

    let priceMatch = line.match(/(?:[\$¥€£]|RM|SGD|MYR)?\s*([0-9]{1,4}\.[0-9]{2})\s*$/i);
    if (!priceMatch) {
      priceMatch = line.match(/\b([0-9]{1,4}\.[0-9]{2})\b/);
    }

    if (priceMatch) {
      const priceVal = parseFloat(priceMatch[1]);
      if (priceVal > 0 && priceVal < 5000) {
        let namePart = line.substring(0, line.lastIndexOf(priceMatch[1]));
        namePart = namePart.replace(/^[\d]+\s*([xX]|\*|\.)\s*/, "");
        namePart = namePart.replace(/^[\d]+\s+/, "");
        namePart = namePart.replace(/[\$¥€£]|RM|SGD|MYR/gi, "");
        namePart = namePart.replace(/[\*\-:=_~|]+/g, " ");
        namePart = namePart.trim();

        if (namePart.length >= 2 && !/^[0-9\s.,-]+$/.test(namePart)) {
          const cleanName = namePart
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");

          items.push({ item: cleanName, price: priceVal });
        }
      }
    }
  }

  // Column fallback if tabular layout
  if (items.length < 2) {
    const candidateNames: string[] = [];
    const candidatePrices: number[] = [];

    for (const lText of lines) {
      const lLower = lText.toLowerCase();
      if (ignoreKeywords.some((w) => lLower.includes(w))) continue;

      if (/^([0-9]{1,4}\.[0-9]{2})$/.test(lText)) {
        candidatePrices.push(parseFloat(lText));
      } else if (lText.length >= 2 && !/^[0-9\s.,-]+$/.test(lText)) {
        const cName = lText.replace(/^[\d]+\s*([xX]|\*|\.)\s*/, "").replace(/^[\d]+\s+/, "").trim();
        if (cName.length >= 2) candidateNames.push(cName);
      }
    }

    if (candidateNames.length >= 2 && candidatePrices.length >= 2) {
      const pairCount = Math.min(candidateNames.length, candidatePrices.length);
      const colItems: Array<{ item: string; price: number }> = [];
      for (let p = 0; p < pairCount; p++) {
        colItems.push({ item: candidateNames[p], price: candidatePrices[p] });
      }
      if (colItems.length > items.length) return colItems;
    }
  }

  return items;
}

// Receipt OCR Endpoint: Google Cloud Vision API with fallback to Gemini
app.post("/api/gemini/receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.VISION_API_KEY) {
      return res.json({
        success: false,
        error: "AI receipt scanning requires a Gemini API key. You can add items manually below.",
        fallback: true,
      });
    }

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, "").trim();

    // 1. Try Google Cloud Vision API first (immune to 503 traffic spikes)
    const visionKey = process.env.VISION_API_KEY || process.env.GEMINI_API_KEY;
    if (visionKey) {
      try {
        console.log("[OCR] Attempting Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)...");
        const visionResp = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(visionKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [
                {
                  image: { content: cleanBase64 },
                  features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
                },
              ],
            }),
          }
        );

        if (visionResp.ok) {
          const vData = (await visionResp.json()) as any;
          let rawText = "";
          if (vData.responses?.[0]?.fullTextAnnotation?.text) {
            rawText = vData.responses[0].fullTextAnnotation.text;
          } else if (vData.responses?.[0]?.textAnnotations?.[0]?.description) {
            rawText = vData.responses[0].textAnnotations[0].description;
          }

          if (rawText && rawText.trim().length > 0) {
            console.log(`[OCR] Google Cloud Vision extracted ${rawText.length} characters.`);
            const parsedItems = parseReceiptTextToItems(rawText);
            if (parsedItems.length > 0) {
              return res.json({ success: true, items: parsedItems, engine: "google-cloud-vision" });
            }
          }
        } else {
          const errText = await visionResp.text();
          console.warn("[OCR] Google Cloud Vision returned non-200:", errText.substring(0, 150));
        }
      } catch (visionErr: any) {
        console.warn("[OCR] Google Cloud Vision error:", visionErr.message);
      }
    }

    // 2. Fallback to Gemini Multimodal Vision if Cloud Vision is unavailable or yielded no items
    const ai = getGeminiClient();

    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-pro-preview",
    ];

    let lastError: any = null;
    let responseText = "{}";

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini OCR] Calling ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `You are a witty, hilarious, and sarcastic dining expense auditor who roasts friends when they upload stupid non-receipt photos.
Analyze this image carefully and perform two evaluations:

EVALUATION 1: RECEIPT VALIDATION (Is this a genuine restaurant or store receipt with item prices?)
- Check if this image depicts an actual restaurant bill, dining receipt, store invoice, or check showing line prices.
- If the photo is of a person, face, selfie, cat, dog, pet, animal, tree, nature, street, shoes, computer screen, or just a plate of food WITHOUT a printed bill with prices:
  Set "isReceipt": false
  Set "detectedSubject": concise description of what is actually in the photo (e.g. 'cat', 'selfie / your face', 'plate of food with no prices', 'a tree / park', 'random shoes')
  Set "rejectMessage": a hilarious, sarcastic, playful roast in 1-2 punchy sentences roasting your friend for uploading it instead of a receipt. E.g. 'Bruh, what the hell are you uploading?! This is literally a picture of a cat, not a receipt. The cat ain\\'t splitting the bill with us! Take a real photo of the receipt.' or 'Nice selfie bro, but your handsome face cannot be split 4 ways into the bill. Upload the actual receipt!' or 'Bro that fried rice looks bomb, but it didn\\'t come with printed prices on the noodles. Shoot the receipt!' (Keep it playful, sarcastic, witty, and funny!)
  Set "items": []

EVALUATION 2: LINE ITEMS EXTRACTION (Only if isReceipt is true)
- Extract each purchased dish or item and its exact numeric final price.
- Ignore subtotal, grand total, tax, service charges, discounts, cash, or change rows.
- Clean up abbreviations into readable dish/item titles.
- Set "isReceipt": true
- Set "detectedSubject": 'dining receipt'
- Set "rejectMessage": ''
- Set "items": [{"item": "Dish Name", "price": 12.50}, ...]`,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isReceipt: {
                  type: Type.BOOLEAN,
                  description: "True if a store/restaurant bill or invoice; false if a person, tree, scenery, pet, or food plate without receipt.",
                },
                detectedSubject: {
                  type: Type.STRING,
                  description: "Concise summary of what is seen in the image",
                },
                rejectMessage: {
                  type: Type.STRING,
                  description: "Polite message to user if rejected",
                },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: {
                        type: Type.STRING,
                        description: "Name of the receipt item or dish",
                      },
                      price: {
                        type: Type.NUMBER,
                        description: "Price of the item as a number",
                      },
                    },
                    required: ["item", "price"],
                  },
                },
              },
              required: ["isReceipt", "detectedSubject", "items"],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          lastError = null;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err.message && err.message.match(/503|429|500/)?.[0]);
        console.warn(`[Gemini OCR] Model ${model} failed (status: ${status || 'err'}): ${err.message}. Instantly switching to next model...`);
      }
    }

    if (lastError && responseText === "{}") {
      throw lastError;
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      }
    }

    const isReceipt = parsedResult.isReceipt !== false;
    const detectedSubject = parsedResult.detectedSubject || (isReceipt ? "dining receipt" : "unrecognized scene");
    const rejectMessage = parsedResult.rejectMessage || "";
    const items = Array.isArray(parsedResult.items) ? parsedResult.items : [];

    return res.json({
      success: true,
      isReceipt,
      detectedSubject,
      rejectMessage,
      items,
      engine: "gemini-vision"
    });
  } catch (err: any) {
    console.error("Receipt analysis error:", err);
    return res.status(500).json({
      error: err.message || "Failed to analyze receipt",
      fallback: true,
    });
  }
});

// Vite middleware for development & Static hosting for production
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupApp();
