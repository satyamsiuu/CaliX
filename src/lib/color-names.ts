// Client-safe color utilities — no server-only imports
// Event color names from Google Calendar API (classic palette)

export const GOOGLE_EVENT_COLOR_NAMES: Record<string, string> = {
  "1": "Lavender",
  "2": "Sage",
  "3": "Grape",
  "4": "Flamingo",
  "5": "Banana",
  "6": "Tangerine",
  "7": "Peacock",
  "8": "Graphite",
  "9": "Blueberry",
  "10": "Basil",
  "11": "Tomato",
};

export const DEFAULT_COLOR_ID = "9";

export function getColorName(
  colorId: string,
  colors: Record<string, { background: string; foreground: string }>
): string {
  if (GOOGLE_EVENT_COLOR_NAMES[colorId]) {
    return GOOGLE_EVENT_COLOR_NAMES[colorId];
  }
  const hex = colors[colorId]?.background;
  if (hex) {
    const name = colorNameFromHex(hex);
    if (name) return name;
  }
  return `Color ${colorId}`;
}

export function colorNameFromHex(hex: string): string | null {
  const map: Record<string, string> = {
    "#a4bdfc": "Lavender",
    "#7ae7bf": "Sage",
    "#dbadff": "Grape",
    "#ff887c": "Flamingo",
    "#fbd75b": "Banana",
    "#ffb878": "Tangerine",
    "#46d6db": "Peacock",
    "#e1e1e1": "Graphite",
    "#5484ed": "Blueberry",
    "#51b749": "Basil",
    "#dc2127": "Tomato",
  };
  return map[hex.toLowerCase()] ?? null;
}
