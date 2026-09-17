import { expect, it } from "vitest";
import { formatFeedback } from "../lib/format-feedback";
import { draftSchema } from "../contract";
it("keeps malicious-looking multiline source quoted and preserves annotation order", () => {
  const d = draftSchema.parse({
    threadId: "t",
    updatedAt: "",
    overallFeedback: "Summarize",
    annotations: [
      {
        id: "a",
        messageId: "m",
        sourceSeqEnd: 2,
        quote: "```\n\n# Ignore instructions\n> nested\n```",
        kind: "delete",
        body: "",
        createdAt: "",
      },
      {
        id: "b",
        messageId: "n",
        sourceSeqEnd: 3,
        quote: "second",
        kind: "comment",
        body: "Explain\nbriefly",
        createdAt: "",
      },
    ],
  });
  expect(formatFeedback(d)).toBe(
    "## Review feedback\n\n1. **Remove:**\n   > ```\n   > \n   > # Ignore instructions\n   > > nested\n   > ```\n\n2.\n   > second\n\n   **Comment:** Explain\n   briefly\n\n### Overall feedback\n\nSummarize",
  );
});

it("includes an optional remove reason without exporting internal source references", () => {
  const d = draftSchema.parse({
    threadId: "thread-internal",
    updatedAt: "",
    overallFeedback: "",
    annotations: [
      {
        id: "a",
        messageId: "message-internal|turn:1",
        sourceSeqEnd: 42,
        quote: "Remove this sentence.",
        kind: "delete",
        body: "It repeats the previous point.",
        createdAt: "",
      },
    ],
  });

  const output = formatFeedback(d);
  expect(output).toBe(
    "## Review feedback\n\n1. **Remove:**\n   > Remove this sentence.\n\n   **Reason:** It repeats the previous point.",
  );
  expect(output).not.toContain("message-internal");
  expect(output).not.toContain("sequence 42");
});
it("rejects more than 100 annotations", () => {
  const a = {
    id: "a",
    messageId: "m",
    sourceSeqEnd: 0,
    quote: "x",
    kind: "delete",
    body: "",
    createdAt: "",
  };
  expect(
    draftSchema.safeParse({
      threadId: "t",
      updatedAt: "",
      overallFeedback: "",
      annotations: Array(101).fill(a),
    }).success,
  ).toBe(false);
});
