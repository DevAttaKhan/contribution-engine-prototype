export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    case "CANCELLED":
    case "EXPIRED":
    case "FAILED":
      return "danger" as const;
    default:
      return "default" as const;
  }
};
