// src/lib/profiles.ts
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { User } from "firebase/auth";

export type StarterInfo = { name: string; type?: string };

export type Profile = {
  uid: string;
  email?: string;
  displayName?: string;
  starter?: StarterInfo | null;
  level: number;
  xp: number;
  createdAt: number;
  updatedAt: number;
  badges?: string[];
};

export async function loadProfile(db: Firestore, user: User): Promise<Profile | null> {
  const ref = doc(db, "profiles", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Profile;
}

export async function createProfile(db: Firestore, user: User, starter?: StarterInfo): Promise<Profile> {
  const ref = doc(db, "profiles", user.uid);
  const now = Date.now();
  const profile: Profile = {
    uid: user.uid,
    email: user.email || undefined,
    displayName: user.displayName || undefined,
    starter: starter ?? null,
    level: 1,
    xp: 0,
    badges: [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function setStarter(db: Firestore, uid: string, starter: StarterInfo) {
  const ref = doc(db, "profiles", uid);
  await updateDoc(ref, { starter, updatedAt: Date.now() });
}

// Simple XP curve: 50, 100, 150, ...
export function xpNeeded(level: number) {
  return 50 * level;
}

// ✅ NEW 3-arg signature to match your App.tsx call
export async function grantXP(db: Firestore, uid: string, deltaXP: number) {
  const ref = doc(db, "profiles", uid);
  await updateDoc(ref, { xp: increment(deltaXP), updatedAt: Date.now() });
}
