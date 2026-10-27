import { test, expect } from "@playwright/test";
test("offline demo learning and certificate journey", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/")) apiRequests.push(r.url());
  });
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Keep growing, Alex 👋" }),
  ).toBeVisible();
  for (let i = 1; i <= 4; i++) {
    await page.goto(`/learning/react/lesson/react-${i}`);
    await page
      .getByRole("button", { name: "Mark complete & continue", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Look at you, making progress." }),
    ).toBeVisible();
  }
  await page.goto("/quiz/react");
  for (const label of [
    "Inputs from a parent",
    "Stable for each item",
    "Removing a subscription",
    "On the server",
  ])
    await page.getByRole("radio", { name: label, exact: true }).check();
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    page.getByRole("heading", { name: "100% · Nicely done!" }),
  ).toBeVisible();
  await page.goto("/certificates/cert-react");
  await expect(
    page.getByRole("heading", { name: "Alex Morgan" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Alex Morgan" }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});
test("paid checkout is explicitly simulated and usable on mobile", async ({
  page,
}) => {
  await page.goto("/checkout/design");
  await expect(
    page.getByText("SIMULATED CHECKOUT", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "I understand this is a simulated transaction.",
    })
    .check();
  await page.getByRole("button", { name: "Complete demo enrollment" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter is unlocked." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start learning", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Course curriculum" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
test("reminder CRUD, profile and messages persist", async ({ page }) => {
  await page.goto("/reminders/new");
  await page.getByLabel("Reminder title").fill("Finish the chapter");
  await page.getByRole("button", { name: "Save reminder" }).click();
  await expect(
    page.getByRole("heading", { name: "Finish the chapter" }),
  ).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("Display name").fill("Taylor Learner");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Taylor Learner" }),
  ).toBeVisible();
  await page.goto("/chat/mentor");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("A test learning question");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Demo reply:", { exact: false })).toBeVisible();
});
