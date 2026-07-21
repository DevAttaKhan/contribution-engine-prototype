import { format, parseISO } from "date-fns";

export const formatDate = (value: string) => {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
};

export const formatDateTime = (value: string) => {
  try {
    return format(parseISO(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
};

export const formatTime = (value: string) => {
  try {
    return format(parseISO(`1970-01-01T${value}`), "HH:mm");
  } catch {
    return value;
  }
};
