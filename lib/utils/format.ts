export const shortId = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

export function hashStable(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return "h_" + (h >>> 0).toString(16);
}

export function userHashFromAlias(alias: string): string {
  return "user_" + hashStable(alias).slice(2, 8) + "_hidden";
}

export function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
