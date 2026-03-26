import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import { ProtectedLayout } from "../src/routes/protected-layout";

const signOutCurrentSession = vi.fn<() => Promise<void>>();

vi.mock("../src/features/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          email: "reader@example.com",
          name: "Reader",
        },
      },
      isPending: false,
    }),
  },
}));

vi.mock("../src/features/auth/auth-service", () => ({
  getAuthErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unable to sign out.",
  signOutCurrentSession: (): Promise<void> => signOutCurrentSession(),
}));

describe("ProtectedLayout", () => {
  it("surfaces sign-out failures instead of leaving an unhandled rejection", async () => {
    signOutCurrentSession.mockRejectedValueOnce(new Error("Unable to sign out."));

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route element={<div>Library body</div>} path="/library" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("Unable to sign out.")).toBeVisible();
    expect(screen.getByText("Library body")).toBeVisible();
  });
});
