import type { Game } from "./model";
// Optional adapters stay outside the local-first domain. No network calls are made by the MVP.
export interface CollectionProvider {
  name: string;
  importCollection(): Promise<Game[]>;
}
export interface IdentityProvider {
  signIn(): Promise<{ id: string; displayName: string }>;
  signOut(): Promise<void>;
}
export interface CommunityProvider {
  sharedChallenges(): Promise<
    { id: string; title: string; gameIds: string[] }[]
  >;
}
