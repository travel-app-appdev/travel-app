// src/utils/PressLock.ts
let isLocked = false;

export const PressLock = {
  acquire(): boolean {
    if (isLocked) return false;
    isLocked = true;
    return true;
  },
  release(): void {
    isLocked = false;
  },
};