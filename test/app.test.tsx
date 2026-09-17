// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

const message = {
  id: "msg_1",
  threadId: "thread-1",
  role: "assistant" as const,
  text: "Keep this exact passage.",
  sourceSeqEnd: 7,
};

afterEach(async () => {
  cleanup();
  const { reviewEditorStore } = await import("../lib/editor-store");
  reviewEditorStore.close();
  vi.clearAllMocks();
});

describe("native selection registration", () => {
  it("registers one selection action, one editor overlay and one composer banner", async () => {
    const app = await loadPluginApp(() => import("../app"));
    expect(app.messageActions.map((action) => action.title)).toEqual(["Feedback"]);
    expect(app.appOverlays.map((overlay) => overlay.id)).toEqual(["feedback-editor"]);
    expect(app.composerCustomizations).toHaveLength(1);
    expect(app.composerCustomizations[0]).toMatchObject({
      id: "thread-feedback",
      scopes: ["thread"],
      banners: [{ id: "draft", chrome: "bare" }],
    });
    expect(app.threadPanelActions).toEqual([]);
    expect(app.navPanels).toEqual([]);
    expect(app.fileOpeners).toEqual([]);
    expect(app.contentScripts.map((script) => script.id)).toEqual(["review-highlights"]);
  });

  it("hands the exact assistant selection to the overlay without the full message", async () => {
    const { reviewEditorStore } = await import("../lib/editor-store");
    const app = await loadPluginApp(() => import("../app"));
    await app.messageActions[0].run({
      threadId: "thread-1",
      message,
      selectedText: " exact passage",
      openPanel: vi.fn(),
    });
    expect(reviewEditorStore.getSnapshot()).toMatchObject({
      mode: "create",
      selection: {
        selectedText: " exact passage",
        message: { id: "msg_1", sourceSeqEnd: 7 },
      },
    });
    const request = reviewEditorStore.getSnapshot();
    expect(request?.mode === "create" ? request.selection.message : {}).not.toHaveProperty("text");
  });
});

it("keeps the mobile editor inside the visual viewport used above the keyboard", async () => {
  const visualViewport = Object.assign(new EventTarget(), {
    height: 320,
    offsetTop: 40,
  }) as VisualViewport;
  const mediaQuery = Object.assign(new EventTarget(), { matches: true }) as MediaQueryList;
  const viewportDescriptor = Object.getOwnPropertyDescriptor(window, "visualViewport");
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: visualViewport,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => mediaQuery,
  });

  const app = await loadPluginApp(() => import("../app"));
  const overlay = renderSlot(app.appOverlays[0], {});
  try {
    await app.messageActions[0].run({
      threadId: "thread-1",
      message,
      selectedText: "exact passage",
      openPanel: vi.fn(),
    });
    const editor = await screen.findByRole("dialog", { name: "Add feedback" });
    await waitFor(() => {
      expect(editor.style.top).toBe(
        "calc(40px + max(0.75rem, env(safe-area-inset-top)))",
      );
      expect(editor.style.maxHeight).toContain("320px");
      expect(editor.style.maxHeight).toContain("env(safe-area-inset-top)");
    });
  } finally {
    overlay.lifecycle.unmount();
    if (viewportDescriptor) Object.defineProperty(window, "visualViewport", viewportDescriptor);
    else delete (window as { visualViewport?: VisualViewport }).visualViewport;
    if (matchMediaDescriptor) Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    else delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
  }
});

it("rejects user messages and missing or oversized selections", async () => {
  const { toast } = await import("sonner");
  const { reviewEditorStore } = await import("../lib/editor-store");
  const app = await loadPluginApp(() => import("../app"));
  for (const context of [
    { message, selectedText: undefined },
    { message, selectedText: " " },
    { message: { ...message, role: "user" as const }, selectedText: "text" },
  ])
    await app.messageActions[0].run({
      threadId: "thread-1",
      ...context,
      openPanel: vi.fn(),
    });
  expect(toast.info).toHaveBeenCalledTimes(3);
  await app.messageActions[0].run({
    threadId: "thread-1",
    message,
    selectedText: "x".repeat(20001),
    openPanel: vi.fn(),
  });
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("20,000"));
  expect(reviewEditorStore.getSnapshot()).toBeNull();
});

it("ignores a stale banner load after navigating to another thread", async () => {
  const app = await loadPluginApp(() => import("../app"));
  const { reviewHighlights } = await import("../lib/review-highlights");
  const setHighlightDraft = vi.spyOn(reviewHighlights, "setDraft");
  const oldDraft = {
    threadId: "thread-old",
    annotations: [],
    overallFeedback: "Old draft",
    updatedAt: new Date(0).toISOString(),
  };
  const currentDraft = {
    threadId: "thread-current",
    annotations: [],
    overallFeedback: "Current draft",
    updatedAt: new Date(1).toISOString(),
  };
  let resolveOld!: (draft: typeof oldDraft) => void;
  const oldLoad = new Promise<typeof oldDraft>((resolve) => {
    resolveOld = resolve;
  });
  const getDraft = (input: unknown) => {
    const { threadId } = input as { threadId: string };
    return threadId === "thread-old" ? oldLoad : Promise.resolve(currentDraft);
  };

  const oldBanner = renderSlot(app.composerCustomizations[0].banners![0], {}, {
    rpc: { getDraft },
    composer: { scope: { kind: "thread", threadId: "thread-old" } },
  });
  await waitFor(() =>
    expect(oldBanner.inspection.rpcCalls.some((call) => call.method === "getDraft")).toBe(true),
  );
  oldBanner.lifecycle.unmount();

  const currentBanner = renderSlot(app.composerCustomizations[0].banners![0], {}, {
    rpc: { getDraft },
    composer: { scope: { kind: "thread", threadId: "thread-current" } },
  });
  try {
    await waitFor(() => expect(setHighlightDraft).toHaveBeenCalledWith(currentDraft));
    await act(async () => resolveOld(oldDraft));
    expect(setHighlightDraft).not.toHaveBeenCalledWith(oldDraft);
  } finally {
    currentBanner.lifecycle.unmount();
  }
});

it("creates in the overlay, edits in place and sends from the composer banner", async () => {
  const { createFakePluginHost } = await import("@get-bb/plugin-sdk/testing");
  const { default: plugin } = await import("../server");
  const { rpcContract } = await import("../contract");
  const { default: userEvent } = await import("@testing-library/user-event");
  const host = createFakePluginHost({
    sdk: { threads: { send: async () => ({ ok: true, delivery: "steered" }) } },
  });
  await plugin(host.bb);
  const rpc = Object.fromEntries(
    Object.keys(rpcContract).map((method) => [
      method,
      (input: unknown) => host.harness.behavior.callRpc(method, input),
    ]),
  );
  const app = await loadPluginApp(() => import("../app"));
  const overlay = renderSlot(app.appOverlays[0], {}, { rpc });
  const user = userEvent.setup();
  const banner = renderSlot(app.composerCustomizations[0].banners![0], {}, {
    rpc,
    composer: { scope: { kind: "thread", threadId: "thread-1" } },
  });
  try {
    await waitFor(() =>
      expect(banner.inspection.rpcCalls.some((call) => call.method === "getDraft")).toBe(true),
    );
    expect(screen.queryByText("Feedback")).toBeNull();

    await app.messageActions[0].run({
      threadId: "thread-1",
      message,
      selectedText: "Keep this exact passage.",
      openPanel: vi.fn(),
    });
    const hostComposer = document.createElement("textarea");
    hostComposer.ariaLabel = "Host composer";
    document.body.append(hostComposer);
    hostComposer.focus();
    expect(document.activeElement).toBe(hostComposer);
    await screen.findByRole("heading", { name: "Add feedback" });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Annotation feedback")),
    );
    hostComposer.focus();
    expect(document.activeElement).toBe(hostComposer);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Annotation feedback")),
    );
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Annotation feedback")),
    );
    const removeButton = screen.getByRole("button", { name: "Remove" });
    removeButton.focus();
    expect(document.activeElement).toBe(removeButton);
    expect(screen.queryByText(/stays in the current thread/i)).toBeNull();
    expect(screen.queryByLabelText("Feedback type")).toBeNull();
    await user.type(
      screen.getByLabelText("Annotation feedback"),
      "Explain the{Shift>}{Enter}{/Shift}assumption{Enter}",
    );
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Add feedback" })).toBeNull());
    await banner.behavior.emitRealtime("draft-changed", { threadId: "thread-1" });
    await screen.findByText("1 item");
    expect(screen.queryByText("Comment: Explain the assumption")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByText(/Comment: Explain the\s+assumption/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("heading", { name: "Edit feedback" });
    await user.clear(screen.getByLabelText("Annotation feedback"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Edit feedback" })).toBeNull());
    await banner.behavior.emitRealtime("draft-changed", { threadId: "thread-1" });
    await screen.findByText("Remove");

    const overall = screen.getByLabelText("Overall feedback") as HTMLTextAreaElement;
    expect(overall.getAttribute("aria-keyshortcuts")).toBe("Control+Enter Meta+Enter");
    await user.type(overall, "Keep the revision concise.{Enter}Preserve this line.");
    expect(overall.value).toBe("Keep the revision concise.\nPreserve this line.");
    await user.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() =>
      expect(host.harness.inspection.sdk.callsTo("threads.send")).toHaveLength(1),
    );
    expect(host.harness.inspection.sdk.callsTo("threads.send")[0]).toMatchObject([
      {
        threadId: "thread-1",
        input: [
          {
            text: expect.stringMatching(
              /Remove:[\s\S]*Keep the revision concise\.\nPreserve this line\./,
            ),
          },
        ],
      },
    ]);

    await rpc.setOverallFeedback({ threadId: "thread-1", value: "Discard this draft." });
    await banner.behavior.emitRealtime("draft-changed", { threadId: "thread-1" });
    await screen.findByText("Feedback");
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("group", { name: "Confirm clearing all feedback" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect((screen.getByLabelText("Overall feedback") as HTMLTextAreaElement).value).toBe(
      "Discard this draft.",
    );
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByText("Feedback")).toBeNull());
  } finally {
    banner.lifecycle.unmount();
    overlay.lifecycle.unmount();
    await host.harness.lifecycle.dispose();
  }
});
