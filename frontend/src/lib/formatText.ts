export const FILENAME_DISPLAY_MAX = 10;

export function truncateText(text: string, maxLength = FILENAME_DISPLAY_MAX): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
