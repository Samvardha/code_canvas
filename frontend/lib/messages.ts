export type FirebaseLikeError = { code?: string; message?: string };

export const GENERIC_AUTH_ERROR = "AUTHENTICATION FAILED";
export const GENERIC_RESET_ERROR = "RESET PROCESS FAILED";
export const GENERIC_GOOGLE_ERROR = "GOOGLE SIGN-IN FAILED";

export function mapAuthError(err: unknown): string {
  const e = err as FirebaseLikeError | null | undefined;
  const code = e?.code ?? "";

  switch (code) {
    case "auth/invalid-email":
      return "ENTER A VALID EMAIL";
    case "auth/missing-email":
      return "EMAIL IS REQUIRED";
    case "auth/missing-password":
      return "PASSWORD IS REQUIRED";

    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "INVALID EMAIL OR PASSWORD";

    case "auth/email-already-in-use":
      return "ACCOUNT ALREADY EXISTS — SIGN IN INSTEAD";
    case "auth/account-exists-with-different-credential":
      return "ACCOUNT EXISTS WITH A DIFFERENT SIGN-IN METHOD";

    case "auth/too-many-requests":
      return "TOO MANY ATTEMPTS — TRY AGAIN LATER";

    case "auth/network-request-failed":
      return "NETWORK ERROR — CHECK YOUR CONNECTION";

    case "auth/popup-closed-by-user":
      return "SIGN-IN POPUP CLOSED";
    case "auth/cancelled-popup-request":
      return "SIGN-IN CANCELLED";
    case "auth/popup-blocked":
      return "POPUP BLOCKED — ALLOW POPUPS AND TRY AGAIN";

    case "auth/weak-password":
      return "PASSWORD IS TOO WEAK";
    case "auth/operation-not-allowed":
      return "SIGN-IN METHOD NOT ENABLED";
    case "auth/user-disabled":
      return "THIS ACCOUNT IS DISABLED";

    default:
      break;
  }

  const raw = (e?.message ?? "").toString().trim();

  if (!raw || raw.replace(/[.\s]/g, "") === "") {
    return GENERIC_AUTH_ERROR;
  }

  return raw.replace(/^Firebase:\s*/i, "").trim();
}


// Connection Messages
export const CONNECTION_SEND_ERROR = "FAILED TO SEND REQUEST";
export const CONNECTION_ACCEPT_ERROR = "FAILED TO ACCEPT REQUEST";
export const CONNECTION_REJECT_ERROR = "FAILED TO REJECT REQUEST";
export const CONNECTION_CANCEL_ERROR = "FAILED TO CANCEL REQUEST";
export const CONNECTION_REMOVE_ERROR = "FAILED TO REMOVE PEER";
export const CONNECTION_STATUS_ERROR = "CONNECTION DATA UNAVAILABLE";

export function mapConnectionError(err: unknown, defaultMsg: string): string {
  if (err instanceof Error) return err.message.toUpperCase();
  return defaultMsg;
}

// Avatar Upload Messages
export const UPLOAD_SUCCESS = "AVATAR_UPDATED_SUCCESSFULLY";
export const UPLOAD_FAILED = "UPLOAD_FAILED";
export const UPLOAD_NETWORK_ERROR = "NETWORK_ERROR_UPLOAD_FAILED";
export const UPLOAD_INVALID_FILE = "INVALID_FILE_TYPE_ONLY_JPEG_PNG_ALLOWED";
export const UPLOAD_FILE_TOO_LARGE = "FILE_TOO_LARGE_MAX_5MB";
export const UPLOAD_TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS_TRY_AGAIN_LATER";
