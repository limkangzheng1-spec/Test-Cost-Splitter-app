export interface HangoutEvent {
  eventId: string;
  eventName: string;
  eventDate: string;
  createdAt?: string;
}

export interface Friend {
  friendId: string;
  eventId: string;
  friendName: string;
}

export interface LineItem {
  itemId: string;
  activityId?: string;
  itemName: string;
  price: number;
  assignedFriends: string; // 'ALL' or comma-separated friendIds like 'FRD_1,FRD_2' or single 'FRD_1'
}

export interface Activity {
  activityId: string;
  eventId: string;
  activityName: string;
  paidByFriendId: string;
  sstPercent: number;
  serviceTaxPercent: number;
  receiptImageUrl?: string;
  lineItems: LineItem[];
}

export interface SettlementDebt {
  debtor: string;
  debtorId: string;
  creditor: string;
  creditorId: string;
  amount: number;
}

export interface UserConsumptionItem {
  activityName: string;
  itemName: string;
  rawPortion: number;
  calculatedTaxShare: number;
  totalWithTax: number;
  splitCount: number;
  payerName: string;
}
