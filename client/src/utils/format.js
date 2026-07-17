export const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || fallback;

export const formatDate = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
};
