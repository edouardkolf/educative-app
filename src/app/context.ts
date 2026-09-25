// Contexte global : profil actif de l'enfant, partagé par tous les écrans.
import { createContext } from 'preact';
import type { Dispatch, StateUpdater } from 'preact/hooks';
import { useContext } from 'preact/hooks';
import type { Profile } from '../storage/types';

export interface ProfileContextValue {
  profile: Profile | null;
  setProfile: Dispatch<StateUpdater<Profile | null>>;
}

export const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  setProfile: () => {},
});

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
