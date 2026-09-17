import type { ReviewDraft } from "../contract";
export function formatFeedback(draft: ReviewDraft): string {
  const sections = ["## Review feedback"];
  draft.annotations.forEach((a, i) => {
    // Keep selected source visibly quoted, even when it contains blank lines,
    // headings, or Markdown fences. The indentation nests it under the item.
    const quote = a.quote
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => `   > ${line}`)
      .join("\n");
    const body = a.body.trim().replace(/\r\n?/g, "\n").replace(/\n/g, "\n   ");

    if (a.kind === "comment") {
      sections.push(`${i + 1}.\n${quote}\n\n   **Comment:** ${body}`);
      return;
    }

    sections.push(
      `${i + 1}. **Remove:**\n${quote}${body ? `\n\n   **Reason:** ${body}` : ""}`,
    );
  });
  if (draft.overallFeedback.trim())
    sections.push(`### Overall feedback\n\n${draft.overallFeedback.trim()}`);
  return sections.join("\n\n");
}
