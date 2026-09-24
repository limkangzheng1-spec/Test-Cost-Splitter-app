import { HangoutEvent, Friend, Activity } from "../types";

export const DEFAULT_EVENTS: HangoutEvent[] = [
  {
    eventId: "EVT_SAMPLE_1",
    eventName: "2026-09-25 Genting Hangout",
    eventDate: "2026-09-25",
    createdAt: "2026-09-21 10:00:00",
  },
];

export const DEFAULT_FRIENDS: Friend[] = [
  { friendId: "FRD_A", eventId: "EVT_SAMPLE_1", friendName: "Friend A (Alice)" },
  { friendId: "FRD_B", eventId: "EVT_SAMPLE_1", friendName: "Friend B (Bob)" },
  { friendId: "FRD_C", eventId: "EVT_SAMPLE_1", friendName: "Friend C (Charlie)" },
  { friendId: "FRD_D", eventId: "EVT_SAMPLE_1", friendName: "Friend D (Diana)" },
];

export const SAMPLE_RECEIPT_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="%23ffffff"><rect width="400" height="600" fill="%23fdfcf9" stroke="%23e2e8f0" stroke-width="2"/><text x="200" y="50" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" fill="%231e293b">DIN TAI FUNG</text><text x="200" y="75" font-family="monospace" font-size="12" text-anchor="middle" fill="%2364748b">Genting Highlands SkyAvenue</text><text x="200" y="95" font-family="monospace" font-size="11" text-anchor="middle" fill="%2364748b">Tel: +60 3-6101 2143</text><line x1="30" y1="115" x2="370" y2="115" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="30" y="140" font-family="monospace" font-size="11" fill="%23475569">Date: 2026-09-25 19:42</text><text x="370" y="140" font-family="monospace" font-size="11" text-anchor="end" fill="%23475569">Table: T-18</text><text x="30" y="160" font-family="monospace" font-size="11" fill="%23475569">Bill: %23DTF-8921</text><line x1="30" y1="180" x2="370" y2="180" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="30" y="210" font-family="monospace" font-size="12" fill="%231e293b">Xiao Long Bao (10 pcs)</text><text x="370" y="210" font-family="monospace" font-size="12" text-anchor="end" font-weight="bold" fill="%231e293b">32.00</text><text x="30" y="240" font-family="monospace" font-size="12" fill="%231e293b">Pork Chop Fried Rice</text><text x="370" y="240" font-family="monospace" font-size="12" text-anchor="end" font-weight="bold" fill="%231e293b">28.50</text><text x="30" y="270" font-family="monospace" font-size="12" fill="%231e293b">Spicy Szechuan Wontons</text><text x="370" y="270" font-family="monospace" font-size="12" text-anchor="end" font-weight="bold" fill="%231e293b">24.00</text><text x="30" y="300" font-family="monospace" font-size="12" fill="%231e293b">Jasmine Hot Tea Pot</text><text x="370" y="300" font-family="monospace" font-size="12" text-anchor="end" font-weight="bold" fill="%231e293b">15.50</text><line x1="30" y1="330" x2="370" y2="330" stroke="%23cbd5e1" stroke-dasharray="4"/><text x="30" y="360" font-family="monospace" font-size="12" fill="%2364748b">SUBTOTAL</text><text x="370" y="360" font-family="monospace" font-size="12" text-anchor="end" fill="%231e293b">100.00</text><text x="30" y="385" font-family="monospace" font-size="12" fill="%2364748b">Service Tax (10%)</text><text x="370" y="385" font-family="monospace" font-size="12" text-anchor="end" fill="%231e293b">10.00</text><text x="30" y="410" font-family="monospace" font-size="12" fill="%2364748b">SST (6%)</text><text x="370" y="410" font-family="monospace" font-size="12" text-anchor="end" fill="%231e293b">6.60</text><line x1="30" y1="435" x2="370" y2="435" stroke="%23334155" stroke-width="1.5"/><text x="30" y="465" font-family="monospace" font-size="16" font-weight="bold" fill="%230f172a">TOTAL DUE</text><text x="370" y="465" font-family="monospace" font-size="16" font-weight="bold" text-anchor="end" fill="%230f172a">MYR 116.60</text><text x="200" y="520" font-family="monospace" font-size="11" text-anchor="middle" fill="%2394a3b8">Thank you for dining with us!</text><text x="200" y="540" font-family="monospace" font-size="10" text-anchor="middle" fill="%2394a3b8">Hangout Expense Splitter Verified</text></svg>`;

export const DEFAULT_ACTIVITIES: Activity[] = [
  {
    activityId: "ACT_DINNER",
    eventId: "EVT_SAMPLE_1",
    activityName: "Dinner at Din Tai Fung",
    paidByFriendId: "FRD_A",
    sstPercent: 6,
    serviceTaxPercent: 10,
    receiptImageUrl: SAMPLE_RECEIPT_URL,
    lineItems: [
      {
        itemId: "ITM_101",
        itemName: "Xiao Long Bao (10 pcs)",
        price: 32.0,
        assignedFriends: "ALL",
      },
      {
        itemId: "ITM_102",
        itemName: "Pork Chop Fried Rice (Bob Only)",
        price: 28.5,
        assignedFriends: "FRD_B",
      },
      {
        itemId: "ITM_103",
        itemName: "Spicy Szechuan Wontons (Alice & Charlie)",
        price: 24.0,
        assignedFriends: "FRD_A,FRD_C",
      },
      {
        itemId: "ITM_104",
        itemName: "Jasmine Hot Tea Pot",
        price: 15.5,
        assignedFriends: "ALL",
      },
    ],
  },
  {
    activityId: "ACT_KARAOKE",
    eventId: "EVT_SAMPLE_1",
    activityName: "Karaoke Session (3 hrs)",
    paidByFriendId: "FRD_B",
    sstPercent: 6,
    serviceTaxPercent: 0,
    lineItems: [
      {
        itemId: "ITM_201",
        itemName: "Large Room Rental",
        price: 140.0,
        assignedFriends: "ALL",
      },
      {
        itemId: "ITM_202",
        itemName: "Beer Tower (Alice, Bob, Diana)",
        price: 65.0,
        assignedFriends: "FRD_A,FRD_B,FRD_D",
      },
    ],
  },
];
