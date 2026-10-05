/** Builds a wa.me deep link with a pre-filled message. No API or account needed. */
export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
