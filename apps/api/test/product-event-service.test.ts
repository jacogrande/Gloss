import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ProductEventRow } from "../src/db/schema";
import { createProductEventService } from "../src/services/product-event-service";
import type { ProductEventRepository } from "../src/repositories/product-event-repository";

const createRepository = (): ProductEventRepository => ({
  insert: vi.fn(() =>
    Promise.reject(new Error("insert should not be called in this test")),
  ),
  list: vi.fn<() => Promise<ProductEventRow[]>>(() =>
    Promise.resolve([
      {
        actorTag: "user_1",
        createdAt: new Date("2026-03-30T00:00:00.000Z"),
        id: "event_1",
        occurredAt: new Date("2026-03-30T00:00:00.000Z"),
        payload: {
          method: "email_password",
        },
        reviewSessionId: null,
        schemaVersion: "product-event.v1",
        seedId: null,
        sessionId: "session_1",
        type: "auth.sign_in",
        userId: "user_1",
      },
      {
        actorTag: "user_1",
        createdAt: new Date("2026-03-30T00:01:00.000Z"),
        id: "event_2",
        occurredAt: new Date("2026-03-30T00:01:00.000Z"),
        payload: {
          method: "email_password",
        },
        reviewSessionId: null,
        schemaVersion: "product-event.v2",
        seedId: null,
        sessionId: "session_2",
        type: "auth.sign_in",
        userId: "user_1",
      },
    ]),
  ),
  listSeedSnapshots: vi.fn(() => Promise.resolve([])),
});

describe("product event service", () => {
  it("filters unsupported schema versions on read", async () => {
    const service = createProductEventService(
      {} as never,
      createRepository(),
    );

    const events = await service.listEvents();
    const [event] = events;

    expect(events).toHaveLength(1);
    expect(event?.schemaVersion).toBe("product-event.v1");
    expect(event?.type).toBe("auth.sign_in");

    if (!event || event.type !== "auth.sign_in") {
      throw new Error("Expected a parsed auth.sign_in event.");
    }

    expect(event.sessionId).toBe("session_1");
  });
});
