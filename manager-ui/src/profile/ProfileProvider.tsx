// Holds the current user's profile (display name). Stubbed for now; swap to a /me fetch later.
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Profile {
  displayName: string;
}

const FALLBACK_NAME = import.meta.env.VITE_DISPLAY_NAME || 'משתמש';

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  // Static identity for now — replace with real auth data.
  const [profile] = useState<Profile>({ displayName: FALLBACK_NAME });

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Profile {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}

// First letters of the name → avatar monogram.
export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}
