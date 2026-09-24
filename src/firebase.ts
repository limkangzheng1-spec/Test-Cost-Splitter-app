import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { HangoutEvent, Friend, Activity } from "./types";

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore (support custom databaseId if configured)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// MANDATORY per Firebase Skill: test connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection: client is offline or network restricted.");
    }
    return false;
  }
}
testConnection();

// ==============================================================
// FIRESTORE REAL-TIME SYNCHRONIZATION HELPERS
// ==============================================================

/**
 * Real-time listener for all hangout events
 */
export function subscribeEvents(
  callback: (events: HangoutEvent[]) => void,
  onError?: (err: Error) => void
) {
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: HangoutEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          eventId: docSnap.id,
          eventName: data.eventName || "Hangout",
          eventDate: data.eventDate || new Date().toISOString().split("T")[0],
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      callback(items);
    },
    (err) => {
      console.warn("Firestore events sync notice:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for friends in a specific event
 */
export function subscribeFriends(
  eventId: string,
  callback: (friends: Friend[]) => void,
  onError?: (err: Error) => void
) {
  if (!eventId) return () => {};
  const friendsRef = collection(db, "events", eventId, "friends");
  return onSnapshot(
    friendsRef,
    (snapshot) => {
      const items: Friend[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          friendId: docSnap.id,
          eventId: eventId,
          friendName: data.friendName || "Friend",
        });
      });
      callback(items);
    },
    (err) => {
      console.warn("Firestore friends sync notice:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for activities/sessions in a specific event
 */
export function subscribeActivities(
  eventId: string,
  callback: (activities: Activity[]) => void,
  onError?: (err: Error) => void
) {
  if (!eventId) return () => {};
  const actRef = collection(db, "events", eventId, "activities");
  const q = query(actRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Activity[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          activityId: docSnap.id,
          eventId: eventId,
          activityName: data.activityName || "Expense Session",
          paidByFriendId: data.paidByFriendId || "",
          sstPercent: Number(data.sstPercent) || 0,
          serviceTaxPercent: Number(data.serviceTaxPercent) || 0,
          receiptImageUrl: data.receiptImageUrl || undefined,
          lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
        });
      });
      callback(items);
    },
    (err) => {
      console.warn("Firestore activities sync notice:", err);
      if (onError) onError(err);
    }
  );
}

// --------------------------------------------------------------
// MUTATION OPERATIONS (PROMISES WITH REAL-TIME WRITE)
// --------------------------------------------------------------

export async function saveEventToFirestore(event: HangoutEvent) {
  const docRef = doc(db, "events", event.eventId);
  await setDoc(
    docRef,
    {
      id: event.eventId,
      eventName: event.eventName,
      eventDate: event.eventDate,
      createdAt: event.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function deleteEventFromFirestore(eventId: string) {
  await deleteDoc(doc(db, "events", eventId));
}

export async function saveFriendToFirestore(eventId: string, friend: Friend) {
  const docRef = doc(db, "events", eventId, "friends", friend.friendId);
  await setDoc(
    docRef,
    {
      id: friend.friendId,
      friendName: friend.friendName,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function deleteFriendFromFirestore(eventId: string, friendId: string) {
  await deleteDoc(doc(db, "events", eventId, "friends", friendId));
}

export async function saveActivityToFirestore(eventId: string, activity: Activity) {
  const docRef = doc(db, "events", eventId, "activities", activity.activityId);
  await setDoc(
    docRef,
    {
      id: activity.activityId,
      activityName: activity.activityName,
      paidByFriendId: activity.paidByFriendId,
      sstPercent: Number(activity.sstPercent) || 0,
      serviceTaxPercent: Number(activity.serviceTaxPercent) || 0,
      receiptImageUrl: activity.receiptImageUrl || "",
      lineItems: activity.lineItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function deleteActivityFromFirestore(eventId: string, activityId: string) {
  await deleteDoc(doc(db, "events", eventId, "activities", activityId));
}
