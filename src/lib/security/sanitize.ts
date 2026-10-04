/**
 * Text normalisation for user-supplied strings. React escapes output (XSS) and Drizzle parameterises
 * every query (SQL injection); this additionally strips control characters and invisible formatting
 * so stored data stays clean and predictable.
 */
export function cleanText(input: string, max = 500): string {
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanMultiline(input: string, max = 1000): string {
  return cleanText(input.replace(/\r\n?/g, "\n"), max).replace(/\n{3,}/g, "\n\n");
}
