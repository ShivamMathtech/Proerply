import type { Services } from "./contracts";
let csrf = "";
let sessionRequest: Promise<unknown> | null = null;
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (
    method !== "GET" &&
    ![
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/verify-reset-code",
      "/auth/reset-password",
    ].includes(path) &&
    !csrf
  ) {
    sessionRequest ??= request<{ csrfToken: string }>("/auth/session").finally(
      () => (sessionRequest = null),
    );
    await sessionRequest;
  }
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error(
      "Cannot reach the API. Check that FastAPI is running and CORS allows this frontend. API mode does not switch to demo.",
    );
  }
  if (res.status === 204) return undefined as T;
  const data = await res
    .json()
    .catch(() => ({ detail: "Invalid server response." }));
  if (!res.ok)
    throw Error(
      typeof data.detail === "string"
        ? data.detail
        : res.status === 422
          ? "Please check the form fields."
          : `Request failed (${res.status}).`,
    );
  if (data.csrfToken) csrf = data.csrfToken;
  return data as T;
}
export const api: Services = {
  auth: {
    async session() {
      const r = await request<{
        user: Awaited<ReturnType<Services["auth"]["session"]>>;
        csrfToken: string;
      }>("/auth/session");
      return r.user;
    },
    async login(email, password) {
      const r = await request<{
        user: Awaited<ReturnType<Services["auth"]["login"]>>;
      }>("/auth/login", "POST", { email, password });
      return r.user;
    },
    async register(name, email, password) {
      const r = await request<{
        user: Awaited<ReturnType<Services["auth"]["register"]>>;
      }>("/auth/register", "POST", { name, email, password });
      return r.user;
    },
    async logout() {
      await request("/auth/logout", "POST");
      csrf = "";
    },
    forgot: (email) => request("/auth/forgot-password", "POST", { email }),
    verify: (email, code) =>
      request("/auth/verify-reset-code", "POST", { email, code }),
    reset: (token, password) =>
      request("/auth/reset-password", "POST", { token, password }),
  },
  courses: {
    listCourses: (f) =>
      request("/courses?" + new URLSearchParams(f as Record<string, string>)),
    getCourse: (id) => request("/courses/" + id),
    instructors: () => request("/instructors"),
    categories: () => request("/categories"),
  },
  search: {
    history: () => request("/search-history"),
    remember: (q) => request("/search-history", "POST", { q }),
    clear: () => request("/search-history", "DELETE"),
  },
  enrollments: {
    list: () => request("/enrollments/me"),
    enroll: (courseId) => request("/enrollments", "POST", { courseId }),
  },
  progress: {
    list: () => request("/progress"),
    update: (id, data) => request("/progress/" + id, "PUT", data),
  },
  quizzes: {
    get: (id) => request("/quizzes/" + id),
    submit: (id, answers) =>
      request("/quizzes/" + id + "/submit", "POST", { answers }),
    attempts: () => request("/assessments"),
  },
  payments: {
    checkout: (courseId) => request("/payments/checkout", "POST", { courseId }),
    orders: () => request("/payments/orders"),
  },
  reminders: {
    list: () => request("/reminders"),
    save: (d, id) =>
      request("/reminders" + (id ? "/" + id : ""), id ? "PATCH" : "POST", d),
    remove: (id) => request("/reminders/" + id, "DELETE"),
  },
  chat: {
    list: () => request("/conversations"),
    send: (id, text) =>
      request("/conversations/" + id + "/messages", "POST", { text }),
    read: (id) => request("/conversations/" + id + "/read", "POST"),
    start: (userId) => request("/conversations", "POST", { userId }),
  },
  profile: {
    get: async () => api.auth.session(),
    update: (d) => request("/users/me", "PATCH", d),
    public: (id) => request("/users/" + id),
  },
  certificates: {
    list: () => request("/certificates"),
    achievements: () => request("/achievements"),
  },
  notifications: {
    save: (notifications) => request("/users/me", "PATCH", { notifications }),
  },
  admin: {
    analytics: () => request("/admin/analytics"),
    courses: () => request("/admin/courses"),
    saveCourse: (c) => request("/admin/courses/" + c.id, "PUT", c),
    setRole: (id, role) => request("/admin/users/" + id, "PATCH", { role }),
    saveCategory: (name) => request("/admin/categories", "POST", { name }),
    saveInstructor: (i) => request("/admin/instructors/" + i.id, "PUT", i),
    saveBadge: (b) => request("/admin/badges/" + b.id, "PUT", b),
    badges: () => request("/admin/badges"),
    moderate: (cid, mid) =>
      request("/admin/conversations/" + cid + "/messages/" + mid, "DELETE"),
  },
  snapshot: () => request("/workspace"),
  async resetDemo() {
    throw Error("Reset is available only in demo mode.");
  },
};
