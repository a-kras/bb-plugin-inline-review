# Manual acceptance checklist

Use the test passage in the final implementation thread response; its durable
source is `TEST_PASSAGE.md`. Start with an empty Inline Review draft and do not
send real feedback until the final step.

## Mobile

- [x] Select ordinary prose and confirm the native menu contains **Feedback**.
- [x] Open the editor and confirm it stays above the iOS or Android keyboard.
- [x] Confirm the feedback field receives focus when the editor opens, rather than the thread composer.
- [x] Press Return to add a comment; use Shift+Return to create a newline where available.
- [x] Confirm Comment, Remove, and Cancel stay on one row.
- [x] Add a comment and confirm its passage has a yellow decoration while staged.
- [x] Add a removal and confirm its passage has a red decoration while staged.
- [x] Navigate to another thread or tab and return; unique highlights should restore consistently.
- [x] Annotate one of two identical sentences, navigate away, and return; the saved item should remain while the ambiguous highlight stays hidden.
- [x] Expand and collapse the Feedback banner.
- [x] Choose Clear, then Keep; confirm the draft remains.
- [x] Choose Clear again, then Clear all; confirm the draft disappears.
- [x] Recreate the review, add Overall feedback, and send once. Confirm one user message appears and the draft disappears.

## Desktop

- [x] Repeat the full flow in light mode and dark mode.
- [x] Select text that crosses bold, inline-code, and link boundaries.
- [x] Select a line inside the fenced code block.
- [x] Verify Return submits and Shift+Return inserts a newline.
- [x] In Overall feedback, confirm Enter inserts a newline and Ctrl+Enter or ⌘+Enter sends the batch.
- [x] Edit a saved comment and convert it to Remove, then back to Comment.
- [x] Remove one item with the × control and confirm only its highlight disappears.
- [x] Reload the browser and confirm unique highlights restore.
- [x] Confirm an ambiguous duplicate remains saved without highlighting after reload.
- [ ] Simulate a send failure if practical; confirm the saved draft remains available.
- [x] Send one final batch and confirm its compact numbered format is readable in thread history.

User acceptance completed in the live BB desktop client on 2026-09-15. The
submitted batch covered formatted Markdown, fenced code, a removal, duplicate
text, and Overall feedback. The optional manual failure simulation remains
covered by automated integration tests.

## Pass criteria

- No user-message selection creates feedback.
- No original assistant message is modified.
- No feedback banner appears for an empty draft.
- The editor never sits behind the mobile keyboard.
- Failed or cancelled actions do not lose saved feedback.
- One Send feedback action creates exactly one thread message.

Mobile acceptance completed in the live BB iOS client on 2026-09-15. The pass
covered selection, keyboard layout and focus, comment and removal decorations,
navigation restoration, ambiguous duplicate handling, review controls, clear
confirmation, and one combined delivery.
