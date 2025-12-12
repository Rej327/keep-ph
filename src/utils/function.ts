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
  return text.replace(/_/g, " ").toUpperCase();
};

export const getStatusFormat = (status: string = ""): string => {
  const colorGroups = {
    green: [
      "ACTIVE",
      "APPROVED",
      "DELIVERED",
      "COMPLETED",
      "ACCEPTED",
      "RECEIVED",
      "RETRIEVED",
      "DIGITAL",
      "PERSONAL",
      "BUSINESS",
      "SCANNED",
      "ACTIVE",
      "SUCCEEDED",
    ],
    blue: [
      "IN_PROGRESS",
      "IN_TRANSIT",
      "MAINTENANCE",
      "SORTED",
      "SCANNING",
      "READY_FOR_PICKUP",
      "FREE",
      "SCHEDULED",
      "DRAFT",
      "SENT",
      "AVAILABLE",
    ],
    yellow: [
      "INACTIVE",
      "PENDING",
      "DISPOSAL",
      "SUSPENDED",
      "ARCHIVED",
      "NON_SUBSCRIBER",
      "ONBOARDING",
      "AWAITING_PAYMENT_METHOD",
      "RETRIEVAL",
    ],
    red: [
      "REJECTED",
      "FULL",
      "DISPOSED",
      "EXPIRED",
      "CANCELED",
      "DECLINED",
      "FAIL",
      "WITHDRAWN",
    ],
    orange: ["RESCHEDULED"],
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
