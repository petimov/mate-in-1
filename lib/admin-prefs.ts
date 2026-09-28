export const ADMIN_STEP_RESET = ["keep", "before"] as const;
export type AdminStepReset = (typeof ADMIN_STEP_RESET)[number];

export const ADMIN_WRONG_MODES = ["click", "first", "all"] as const;
export type AdminWrongMode = (typeof ADMIN_WRONG_MODES)[number];

const KEY = "admin-step-reset";
const WRONG_KEY = "admin-wrong-mode";

export function readAdminStepReset(): AdminStepReset {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "before" ? "before" : "keep";
  } catch {
    return "keep";
  }
}

export function writeAdminStepReset(value: AdminStepReset) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
}

export function readAdminWrongMode(): AdminWrongMode {
  try {
    const value = window.localStorage.getItem(WRONG_KEY);
    if (value === "click" || value === "all") return value;
    return "first";
  } catch {
    return "first";
  }
}

export function writeAdminWrongMode(value: AdminWrongMode) {
  try {
    window.localStorage.setItem(WRONG_KEY, value);
  } catch {
    /* ignore */
  }
}
