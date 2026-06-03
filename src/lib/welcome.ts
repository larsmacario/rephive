const WELCOME_STORAGE_KEY = "rephive:welcome:v1";

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "1");
  } catch {
    /* private mode / storage full */
  }
}
