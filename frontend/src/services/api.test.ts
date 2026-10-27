import { beforeEach, afterEach, expect, it, vi } from "vitest";
beforeEach(() => vi.resetModules());
afterEach(() => vi.restoreAllMocks());
it("API mode reports outages instead of substituting demo data", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
  const { api } = await import("./api");
  await expect(api.courses.listCourses()).rejects.toThrow(
    "does not switch to demo",
  );
});
it("loads a CSRF token before a protected mutation and includes cookies", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ csrfToken: "csrf-test", user: { id: "user" } }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "reminder" }), { status: 201 }),
    );
  const { api } = await import("./api");
  await api.reminders.save({
    title: "Study",
    description: "",
    dueAt: "2030-01-01T00:00:00Z",
    completed: false,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toContain("/auth/session");
  expect(fetch.mock.calls[1][1]).toMatchObject({
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": "csrf-test" },
  });
});
it("obtains CSRF after reload before logout and handles empty responses", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ csrfToken: "current" }), { status: 200 }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  const { api } = await import("./api");
  await api.auth.logout();
  expect(fetch.mock.calls[1][1]).toMatchObject({
    headers: { "X-CSRF-Token": "current" },
  });
});
