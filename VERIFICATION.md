# Verification

## Version 1.0.0

Validated on 2026-09-17 against BB 0.43.1 and Plugin SDK 0.4.87.

### Automated checks

- `npm ci` completed from the committed lockfile with zero reported
  vulnerabilities.
- `npm test` passed 20 tests across 4 files, including the public-SDK-only
  import scan.
- `npm run typecheck` passed in strict mode.
- `npm run sdk:check` confirmed that the package and host both use Plugin SDK
  0.4.87.
- `npm run build` emitted the server and app bundles for version 1.0.0.
- `npm pack --dry-run --ignore-scripts` contained only the expected source,
  documentation, tests, and assets.
- `inline-review@1.0.0` was installed from the local release tree and reported
  as running.

### Live acceptance

Desktop and iOS checks covered native assistant-text selection, comment and
removal entry, staged highlight colors, editing, Overall feedback, confirmed
clearing, one batched delivery, and draft clearing after accepted delivery.

Navigation and reload checks confirmed that unique selections restore across
tabs. Repeated text remains saved without restoring an ambiguous highlight.
Mobile checks also covered software-keyboard positioning, focus recovery after
the iOS selection menu closes, Return submission, and the single-row action
layout.

### Release assets and privacy

The five marketplace screenshots use generic demonstration content, contain no
account details or private project data, are at least 1,200 pixels wide, and
remain below 2 MiB each. The repository contains no environment files,
credentials, private keys, local absolute paths, internal planning artifacts,
or BB thread, project, and environment identifiers.

### Known limits

Version 1 annotates assistant-message text only. BB does not expose persistent
selection anchors, so highlight restoration requires one unique normalized
text match in the visible assistant-message DOM. Ambiguous passages remain in
the saved review without a decoration. Browsers without the CSS Custom
Highlight API retain capture, persistence, review, and delivery without
passage coloring.
