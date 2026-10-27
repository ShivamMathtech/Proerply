import { beforeEach, describe, expect, it, vi } from "vitest";
import { demo, resetDemoMemoryForTests } from "./demo";
import raw from "../data/catalog.json";
beforeEach(() => {
  localStorage.clear();
  resetDemoMemoryForTests();
});
describe("Complete browser-only demo", () => {
  it("supports checkout, reminders and chat when randomUUID is unavailable on HTTP", async () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    try {
      const order = await demo.payments.checkout("design");
      expect(order.status).toBe("demo_paid");
      const reminder = await demo.reminders.save({
        title: "Study on mobile",
        description: "",
        dueAt: new Date().toISOString(),
        completed: false,
      });
      await demo.chat.send("mentor", "Hello from a local preview");
      resetDemoMemoryForTests();
      const state = await demo.snapshot();
      expect(state.orders.some((value) => value.id === order.id)).toBe(true);
      expect(state.reminders.some((value) => value.id === reminder.id)).toBe(
        true,
      );
      expect(state.conversations[0].messages.at(-1)?.text).toContain(
        "Demo reply",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("never makes a backend request during core flows", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(Error("offline"));
    try {
      await demo.auth.login("learner@proerply.demo", "DemoPass123!");
      await demo.courses.listCourses();
      await demo.progress.update("react-1", { completed: true });
      await demo.reminders.list();
      await demo.chat.send("mentor", "Hello!");
      await demo.snapshot();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  it("filters by instructor, category, free price and rating; sorts prices", async () => {
    expect(
      (
        await demo.courses.listCourses({ q: "Leo Williams", price: "free" })
      ).map((c) => c.id),
    ).toEqual(["react", "python"]);
    expect(
      await demo.courses.listCourses({ category: "Design", rating: "4.8" }),
    ).toHaveLength(1);
    const sorted = await demo.courses.listCourses({ sort: "price" });
    expect(sorted.map((c) => c.price)).toEqual([0, 0, 29, 39, 49, 59]);
    expect(await demo.courses.listCourses({ q: "unmatchable xyz" })).toEqual(
      [],
    );
  });
  it("requires checkout for paid enrollment and records one demo transaction", async () => {
    await expect(demo.enrollments.enroll("design")).rejects.toThrow("checkout");
    const o = await demo.payments.checkout("design");
    expect(o.status).toBe("demo_paid");
    await demo.payments.checkout("design");
    expect(await demo.payments.orders()).toHaveLength(1);
    expect(
      (await demo.enrollments.list()).filter((e) => e.courseId === "design"),
    ).toHaveLength(1);
  });
  it("grants certificates only after all lessons and a passing quiz", async () => {
    const c = raw.courses.find((c) => c.id === "react")!;
    const answers = Object.fromEntries(
      c.quiz.questions.map((q) => [q.id, q.correct]),
    );
    await demo.quizzes.submit("react", answers);
    expect(await demo.certificates.list()).toHaveLength(0);
    for (const l of c.lessons)
      await demo.progress.update(l.id, { completed: true });
    expect(await demo.certificates.list()).toHaveLength(1);
    await demo.progress.update("react-1", { completed: true });
    expect(await demo.certificates.list()).toHaveLength(1);
    expect((await demo.certificates.achievements()).map((b) => b.id)).toEqual(
      expect.arrayContaining(["first-step", "curious-mind", "graduate"]),
    );
  });
  it("scores wrong answers and retries correctly", async () => {
    const c = raw.courses[1];
    const wrong = Object.fromEntries(
      c.quiz.questions.map((q) => [q.id, (q.correct + 1) % q.options.length]),
    );
    const a = await demo.quizzes.submit("react", wrong);
    expect(a.score).toBe(0);
    expect(a.passed).toBe(false);
    expect(a.feedback).toHaveLength(4);
    await expect(demo.quizzes.submit("react", {})).rejects.toThrow(
      "every question",
    );
  });
  it("persists progress, profiles, history, reminders and chat across reload", async () => {
    await demo.profile.update({ name: "Test Learner", bio: "A new skill" });
    await demo.search.remember("React");
    await demo.progress.update("react-1", { position: 37, completed: true });
    const r = await demo.reminders.save({
      title: "Study",
      description: "Practice",
      dueAt: new Date().toISOString(),
      completed: false,
    });
    await demo.reminders.save({ ...r, completed: true }, r.id);
    await demo.chat.send("mentor", "Can you help?");
    resetDemoMemoryForTests();
    const s = await demo.snapshot();
    expect(s.user?.name).toBe("Test Learner");
    expect(s.progress[0].position).toBe(37);
    expect(s.history).toEqual(["React"]);
    expect(s.reminders.find((x) => x.id === r.id)?.completed).toBe(true);
    expect(s.conversations[0].messages.at(-1)?.text).toContain("Demo reply");
    await demo.reminders.remove(r.id);
    expect((await demo.reminders.list()).some((x) => x.id === r.id)).toBe(
      false,
    );
  });
  it("keeps different demo profiles separate", async () => {
    await demo.progress.update("react-1", { completed: true });
    await demo.auth.login("admin@proerply.demo", "DemoPass123!");
    expect(await demo.progress.list()).toEqual([]);
    await demo.auth.login("learner@proerply.demo", "DemoPass123!");
    expect(await demo.progress.list()).toHaveLength(1);
  });
  it("recovers from malformed and outdated persistence", async () => {
    for (const value of [
      "{invalid",
      '{"version":0}',
      '{"version":1,"catalogs":[]}',
    ]) {
      localStorage.setItem("proerply.demo.v1", value);
      resetDemoMemoryForTests();
      expect((await demo.courses.listCourses()).length).toBe(6);
    }
  });
  it("enforces management roles and persists course edits", async () => {
    await expect(demo.admin.analytics()).rejects.toThrow("access");
    await demo.auth.login("instructor@proerply.demo", "DemoPass123!");
    const c = structuredClone(await demo.courses.getCourse("design"));
    c.title = "A better design course";
    await demo.admin.saveCourse(c);
    expect((await demo.courses.getCourse("design")).title).toBe(c.title);
    await expect(
      demo.admin.saveCourse(await demo.courses.getCourse("react")),
    ).rejects.toThrow("own courses");
  });
  it("offers a labeled, single-use mock reset flow", async () => {
    expect((await demo.auth.forgot("learner@proerply.demo")).message).toContain(
      "no email",
    );
    await expect(
      demo.auth.verify("learner@proerply.demo", "000000"),
    ).rejects.toThrow();
    const t = await demo.auth.verify("learner@proerply.demo", "123456");
    await demo.auth.reset(t.token, "NewPass123!");
    await expect(demo.auth.reset(t.token, "AnotherPass123!")).rejects.toThrow();
  });
});
