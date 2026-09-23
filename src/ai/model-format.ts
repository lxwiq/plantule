/** "2,6 Go", "850 Mo": sizes as the phone's settings show them. */
export function formatBytes(bytes: number): string {
  const gigabytes = bytes / 1e9;
  if (gigabytes >= 1) return `${gigabytes.toFixed(1).replace('.', ',')} Go`;
  return `${Math.max(1, Math.round(bytes / 1e6))} Mo`;
}
