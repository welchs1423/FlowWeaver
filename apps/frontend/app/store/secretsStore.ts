import { create } from 'zustand';
import { fetchSecrets, type SecretRecord } from '../lib/api';

interface SecretsState {
  secrets: SecretRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  setSecrets: (secrets: SecretRecord[]) => void;
}

export const useSecretsStore = create<SecretsState>()((set) => ({
  secrets: [],
  loaded: false,

  load: async () => {
    try {
      const data = await fetchSecrets();
      set({ secrets: data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  setSecrets: (secrets) => set({ secrets }),
}));
