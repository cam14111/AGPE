export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(
    new Date(`${date}T12:00:00`),
  );
}
export function formatTime(time: string): string {
  return time.slice(0, 5).replace(":", "h");
}
export function isPastDate(date?: string | null): boolean {
  if (!date) return false;
  return new Date(`${date}T23:59:59`) < new Date();
}
