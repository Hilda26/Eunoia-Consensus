import { format, formatDistanceToNowStrict } from "date-fns";
export const fmtTime = (ts: number) => format(new Date(ts), "HH:mm:ss");
export const fmtDay = (ts: number) => format(new Date(ts), "MMM d");
export const fmtAgo = (ts: number) => formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
