import { 
  fetchSignInMethodsForEmail, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  User
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export async function checkEmailSignInMethods(email: string): Promise<string[]> {
  return fetchSignInMethodsForEmail(auth, email);
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function sendUserEmailVerification(user: User): Promise<void> {
  return sendEmailVerification(user);
}
