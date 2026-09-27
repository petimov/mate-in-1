export const ADMIN_STEP_RESET = ["keep", "before"] as const;
export type AdminStepReset = (typeof ADMIN_STEP_RESET)[number];

const KEY = "admin-step-reset";

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
