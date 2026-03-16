export type ValidationKey =
  | "text"
  | "collab_title"
  | "collab_duration"
  | "collab_looking_for"
  | "collab_requirements"
  | "event_title"
  | "event_rsvp"
  | "event_start"
  | "event_end"
  | "event_address"
  | "event_city"
  | "event_state"
  | "event_pincode";

export interface CollabMeta {
  title: string;
  duration: string;
  looking_for: string[];
  requirements: string[];
  status: string;
}

export interface EventMeta {
  title: string;
  description: string;
  venue: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  start_at: string;
  end_at: string;
  rsvp_url: string;
  mode: string;
  status: string;
}

/**
 * Formats date from backend (YYYY-MM-DD or ISO) to DD/MM/YYYY
 */
export const formatFromBackend = (dateStr: string | null | undefined): string => {
  if (!dateStr || !dateStr.includes("-")) return dateStr || "";
  const [y, m, d] = dateStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

/**
 * Formats date from frontend (DD/MM/YYYY) to YYYY-MM-DD
 */
export const formatToBackend = (dateStr: string): string | null => {
  if (!dateStr || dateStr.length < 10) return null;
  const [d, m, y] = dateStr.split("/");
  return `${y}-${m}-${d}`;
};

/**
 * Parses DD/MM/YYYY string into a Date object
 */
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() + 1 !== Number(m) ||
    date.getDate() !== Number(d)
  )
    return null;
  return date;
};

/**
 * Validates post data and returns a list of validation errors
 */
export const validatePostData = (
  text: string,
  selectedCategory: string | null,
  collabMeta: CollabMeta,
  eventMeta: EventMeta,
  editId: string | null
): ValidationKey[] => {
  const errors: ValidationKey[] = [];

  if (!text.trim()) {
    errors.push("text");
  }

  if (selectedCategory === "collab") {
    if (!collabMeta.title) errors.push("collab_title");
    if (!collabMeta.duration) errors.push("collab_duration");
    if (collabMeta.looking_for.length === 0) errors.push("collab_looking_for");
    if (collabMeta.requirements.length === 0) errors.push("collab_requirements");
  }

  if (selectedCategory === "event") {
    if (!eventMeta.title) errors.push("event_title");

    const startDate = parseDate(eventMeta.start_at);
    const endDate = parseDate(eventMeta.end_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!startDate) {
      errors.push("event_start");
    } else if (!editId && startDate < today) {
      errors.push("event_start");
    }

    if (!endDate) {
      errors.push("event_end");
    } else if (startDate && endDate < startDate) {
      errors.push("event_end");
    }

    if (eventMeta.mode === "offline") {
      if (!eventMeta.venue.address) errors.push("event_address");
      if (!eventMeta.venue.city) errors.push("event_city");
      if (!eventMeta.venue.state) errors.push("event_state");
      if (!eventMeta.venue.pincode) errors.push("event_pincode");
    }
  }

  return errors;
};

/**
 * Common input formatting logic
 */
export const formatTextInput = (val: string): string => {
  // No two consecutive spaces
  let formatted = val.replace(/  +/g, " ");
  // Cannot start with space
  if (formatted.startsWith(" ")) formatted = formatted.trimStart();
  // Start with capital letter
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  return formatted;
};

export const formatAlphanumeric = (val: string): string => {
  return val.replace(/[^a-zA-Z0-9 ]/g, "");
};

export const formatUrlChars = (val: string): string => {
  return val.replace(/[^a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=%]/g, "");
};

export const formatAlphaOnly = (val: string): string => {
  return val.replace(/[^a-zA-Z ]/g, "");
};
