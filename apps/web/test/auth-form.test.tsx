import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AuthForm } from "../src/features/auth/AuthForm";

describe("AuthForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("submits sign-up fields including the name", () => {
    const onSubmit = vi.fn();

    render(
      <AuthForm
        errorMessage={null}
        isPending={false}
        mode="sign-up"
        onModeChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /^Name/ }), {
      target: { value: "Gloss Reader" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^Email/ }), {
      target: { value: "reader@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "password1234" },
    });
    fireEvent.submit(screen.getByTestId("auth-form"));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "reader@example.com",
      name: "Gloss Reader",
      password: "password1234",
    });
  });

  it("shows the password length hint only for account creation", () => {
    const props = {
      errorMessage: null,
      isPending: false,
      onModeChange: vi.fn(),
      onSubmit: vi.fn(),
    };

    const { rerender } = render(<AuthForm {...props} mode="sign-in" />);

    expect(screen.queryByText("Use at least 8 characters.")).toBeNull();
    expect(screen.getByPlaceholderText("Your password")).toBeVisible();

    rerender(<AuthForm {...props} mode="sign-up" />);

    expect(screen.getByText("Use at least 8 characters.")).toBeVisible();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeVisible();
  });
});
