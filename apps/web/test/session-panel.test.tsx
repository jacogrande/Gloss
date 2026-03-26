import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionPanel } from "../src/features/app-shell/SessionPanel";

describe("SessionPanel", () => {
  it("renders the authenticated session snapshot", () => {
    const onSignOut = vi.fn();

    render(
      <SessionPanel
        onSignOut={onSignOut}
        profile={{
          profile: {
            createdAt: "2026-03-26T12:34:56.000Z",
            updatedAt: "2026-03-26T12:34:56.000Z",
            userId: "user_123",
          },
          session: {
            expiresAt: "2026-03-26T12:34:56.000Z",
            id: "session_123",
            userId: "user_123",
          },
          user: {
            email: "reader@example.com",
            id: "user_123",
            image: null,
            name: "Reader",
          },
        }}
        status="ready"
      />,
    );

    expect(screen.getByText("Reader")).toBeInTheDocument();
    expect(screen.getByText("reader@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
