export function formatReminder(amount: number, unit: string): string {
  if (unit === "minutes") return `${amount} minute${amount !== 1 ? "s" : ""}`;
  if (unit === "hours") return `${amount} hour${amount !== 1 ? "s" : ""}`;
  if (unit === "days") return `${amount} day${amount !== 1 ? "s" : ""}`;
  return `${amount} ${unit}`;
}

export function formatRecurrence(r: string): string {
  switch (r) {
    case "DAILY":
      return "Repeats daily";
    case "WEEKLY":
      return "Repeats weekly";
    case "MONTHLY":
      return "Repeats monthly";
    case "YEARLY":
      return "Repeats yearly";
    default:
      return "Does not repeat";
  }
}
