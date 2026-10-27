import { create } from "zustand";
export const useUI = create<{
  toast: string;
  notice: (message: string) => void;
  dismiss: () => void;
}>((set) => ({
  toast: "",
  notice: (toast) => set({ toast }),
  dismiss: () => set({ toast: "" }),
}));
