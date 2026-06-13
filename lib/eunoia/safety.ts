const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bsuicid/i,
  /\bend it all\b/i,
  /\bhurt myself\b/i,
  /\bself[- ]?harm/i,
  /\bcan'?t go on\b/i,
  /\bwant to die\b/i
];

const MEDICAL_PATTERNS = [
  /\bdiagnos/i,
  /\byou have (depression|anxiety|bpd|ptsd|bipolar)\b/i,
  /\btake (this )?medication\b/i,
  /\bprescribe/i
];

export function detectCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some(r => r.test(text));
}

export function detectMedicalAdvice(text: string): boolean {
  return MEDICAL_PATTERNS.some(r => r.test(text));
}

export function getSafetyResponse(): string {
  return "I am really sorry you are feeling this. Eunoia is not emergency support. If you may be in immediate danger, contact local emergency services now or reach out to someone you trust immediately.";
}

export const GLOBAL_DISCLAIMER =
  "Eunoia is a wellness accountability product. It does not provide medical diagnosis, therapy, treatment, crisis support, or emergency care.";

export const ASSISTANT_DISCLAIMER =
  "This is a wellness reflection, not medical advice, therapy, diagnosis, or crisis support.";

export function appendMedicalDisclaimer(text: string): string {
  return `${text}\n\n${ASSISTANT_DISCLAIMER}`;
}

export function validateNonMedicalCopy(text: string): { ok: boolean; reason?: string } {
  if (detectMedicalAdvice(text)) return { ok: false, reason: "Copy contains medical or diagnostic language." };
  return { ok: true };
}
