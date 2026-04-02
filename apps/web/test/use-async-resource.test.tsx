import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { useAsyncResource } from "../src/lib/use-async-resource";

const createDeferred = <TValue,>(): {
  promise: Promise<TValue>;
  reject: (reason?: unknown) => void;
  resolve: (value: TValue | PromiseLike<TValue>) => void;
} => {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    reject,
    resolve,
  };
};

describe("useAsyncResource", () => {
  it("preserves stale data on refresh failures when requested", async () => {
    const firstLoad = createDeferred<string>();
    const load = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(() => firstLoad.promise)
      .mockRejectedValueOnce(new Error("Refresh failed."));

    const Probe = (): ReactElement => {
      const resource = useAsyncResource({
        dependencies: [],
        getErrorMessage: (error) =>
          error instanceof Error ? error.message : "Unknown error.",
        load,
        preserveDataOnError: true,
      });

      return (
        <div>
          <p>{resource.data ?? "no-data"}</p>
          <p>{resource.errorMessage ?? "no-error"}</p>
          <p>{resource.isRefreshing ? "refreshing" : "steady"}</p>
          <button
            onClick={() => {
              resource.reload();
            }}
            type="button"
          >
            Reload
          </button>
        </div>
      );
    };

    render(<Probe />);

    firstLoad.resolve("alpha");

    expect(await screen.findByText("alpha")).toBeVisible();

    screen.getByRole("button", { name: "Reload" }).click();

    await waitFor(() => {
      expect(screen.getByText("Refresh failed.")).toBeVisible();
    });

    expect(screen.getByText("alpha")).toBeVisible();
    expect(screen.getByText("steady")).toBeVisible();
  });
});
