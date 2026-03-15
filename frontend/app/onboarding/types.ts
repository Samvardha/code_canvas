export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export interface OnboardingFormData {
  name: string;
  username: string;
  bio: string;
  location: string;
  avatar_url: string;
  skills: string[];
}
