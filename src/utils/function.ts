export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
};

export const getErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return JSON.stringify(err);
};

export const replaceUnderscore = (text: string): string => {
  return text.replace(/_/g, " ");
};

export const normalizeColumnName = (label: string, index: number) =>
  label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "") || `field_${index}`;

export const getStatusColor = (status: string = ""): string => {
  const colorGroups = {
    green: ["APPROVED", "COMPLETED", "OFFERED", "PASS", "ACCEPTED", "MEMBER"],
    blue: ["IN_PROGRESS", "SCHEDULED", "DRAFT", "SENT", "AVAILABLE"],
    yellow: ["PENDING", "ONBOARDING"],
    orange: ["RESCHEDULED"],
    red: ["REJECTED", "CANCELED", "DECLINED", "FAIL", "REJECTED", "WITHDRAWN"],
  };

  const statusToColor = Object.entries(colorGroups).reduce(
    (acc, [color, statuses]) => {
      statuses.forEach((s) => (acc[s] = color));
      return acc;
    },
    {} as Record<string, string>
  );

  return statusToColor[status.toUpperCase()] || "gray";
};
