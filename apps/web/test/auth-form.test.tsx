import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "../src/features/auth/AuthForm";

describe("AuthForm", () => {
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

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Gloss Reader" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "reader@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1234" },
    });
    fireEvent.submit(screen.getByTestId("auth-form"));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "reader@example.com",
      name: "Gloss Reader",
      password: "password1234",
    });
  });
});
