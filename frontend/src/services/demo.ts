import raw from "../data/catalog.json";
import { createId } from "../id";
import type { Services } from "./contracts";
import type {
  Course,
  User,
  Snapshot,
  Instructor,
  Badge,
  Filters,
  Reminder,
  Attempt,
  Progress,
  Conversation,
  Order,
} from "../types";
const KEY = "proerply.demo.v1";
const stamp = () => new Date().toISOString();
const id = createId;
const users: User[] = [
  {
    id: "learner",
    name: "Alex Morgan",
    email: "learner@proerply.demo",
    role: "learner",
    bio: "Learning a little, every day.",
    avatar: "",
    publicProfile: true,
    notifications: false,
    onboarding: false,
  },
  {
    id: "teacher",
    name: "Maya Chen",
    email: "instructor@proerply.demo",
    role: "instructor",
    bio: raw.instructors[0].bio,
    avatar: "",
    publicProfile: true,
    notifications: false,
    onboarding: true,
  },
  {
    id: "admin",
    name: "Jordan Lee",
    email: "admin@proerply.demo",
    role: "admin",
    bio: "Helping our learning community grow.",
    avatar: "",
    publicProfile: false,
    notifications: false,
    onboarding: true,
  },
];
interface Store {
  version: 1;
  current: string | null;
  users: User[];
  catalogs: Course[];
  instructors: Instructor[];
  categories: string[];
  badges: Badge[];
  accounts: Record<string, Snapshot>;
  reset?: { email: string; token?: string };
}
function account(user: User): Snapshot {
  return {
    user,
    enrollments: [{ courseId: "react", createdAt: stamp() }],
    progress: [],
    attempts: [],
    reminders: [
      {
        id: "welcome-reminder",
        title: "A little learning, a big step",
        description: "Make time for your first React lesson.",
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        completed: false,
      },
    ],
    conversations: [
      {
        id: "mentor",
        name: "Maya Chen",
        subtitle: "Product design mentor · simulated",
        members: [user.id, "teacher"],
        messages: [
          {
            id: "welcome",
            senderId: "teacher",
            text: "Welcome! What would you like to learn this week? This is a simulated demo conversation.",
            createdAt: stamp(),
            read: false,
          },
        ],
      },
    ],
    achievements: [],
    certificates: [],
    orders: [],
    history: [],
  };
}
function initial(): Store {
  return {
    version: 1,
    current: "learner",
    users: structuredClone(users),
    catalogs: structuredClone(raw.courses) as Course[],
    instructors: structuredClone(raw.instructors),
    categories: [...raw.categories],
    badges: structuredClone(raw.badges),
    accounts: Object.fromEntries(users.map((u) => [u.id, account(u)])),
  };
}
let memory: Store | undefined;
export let persistenceWarning = "";
function read(): Store {
  if (memory) return memory;
  try {
    const value = localStorage.getItem(KEY);
    if (value) {
      const v = JSON.parse(value);
      if (
        v.version === 1 &&
        Array.isArray(v.catalogs) &&
        v.catalogs.every(
          (c: Course) =>
            Array.isArray(c.lessons) && Array.isArray(c.quiz?.questions),
        ) &&
        Array.isArray(v.users) &&
        Array.isArray(v.badges) &&
        Array.isArray(v.instructors) &&
        Array.isArray(v.categories) &&
        v.accounts &&
        v.users.every((u: User) => {
          const a = v.accounts[u.id];
          return (
            a &&
            [
              "enrollments",
              "progress",
              "attempts",
              "reminders",
              "conversations",
              "achievements",
              "certificates",
              "orders",
              "history",
            ].every((k) => Array.isArray(a[k]))
          );
        }) &&
        (!v.current || v.accounts[v.current])
      )
        return (memory = v);
    }
  } catch {
    persistenceWarning =
      "Browser storage is unavailable or damaged. This session uses fresh demo data.";
  }
  return (memory = initial());
}
function save(s: Store) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    persistenceWarning =
      "Changes are kept for this session only because browser storage is unavailable or full.";
  }
}
function state() {
  const s = read();
  if (!s.current) throw Error("Please sign in to continue.");
  const a = s.accounts[s.current];
  a.user = s.users.find((u) => u.id === s.current)!;
  return a;
}
function course(cid: string) {
  const c = read().catalogs.find((c) => c.id === cid);
  if (!c) throw Error("Course not found.");
  return c;
}
function eligible(cid: string) {
  const a = state(),
    c = course(cid);
  return (
    c.lessons.length > 0 &&
    c.lessons.every((l) =>
      a.progress.some((p) => p.lessonId === l.id && p.completed),
    ) &&
    a.attempts.some((t) => t.quizId === cid && t.passed)
  );
}
function award() {
  const s = read(),
    a = state();
  for (const b of s.badges) {
    const ok =
      b.kind === "lesson"
        ? a.progress.filter((p) => p.completed).length >= b.threshold
        : b.kind === "quiz"
          ? a.attempts.some((t) => t.score >= b.threshold)
          : s.catalogs.filter((c) => eligible(c.id)).length >= b.threshold;
    if (ok && !a.achievements.some((x) => x.id === b.id))
      a.achievements.push({ ...b, awardedAt: stamp() });
  }
  for (const c of s.catalogs)
    if (eligible(c.id) && !a.certificates.some((x) => x.courseId === c.id))
      a.certificates.push({
        id: "cert-" + c.id,
        courseId: c.id,
        courseTitle: c.title,
        name: a.user!.name,
        issuedAt: stamp(),
      });
  save(s);
}
export function filterCourses(courses: Course[], f: Filters = {}) {
  let out = courses.filter((c) => c.published);
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter((c) =>
      [
        c.title,
        c.description,
        c.category,
        ...c.outcomes,
        read().instructors.find((i) => i.id === c.instructorId)?.name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (f.category) out = out.filter((c) => c.category === f.category);
  if (f.level) out = out.filter((c) => c.level === f.level);
  if (f.rating) out = out.filter((c) => c.rating >= Number(f.rating));
  if (f.duration)
    out = out.filter((c) =>
      f.duration === "short" ? c.duration <= 60 : c.duration > 60,
    );
  if (f.price)
    out = out.filter((c) => (f.price === "free" ? c.price === 0 : c.price > 0));
  return out.sort((a, b) =>
    f.sort === "rating"
      ? b.rating - a.rating
      : f.sort === "popular"
        ? b.students - a.students
        : f.sort === "price"
          ? a.price - b.price
          : f.sort === "price-desc"
            ? b.price - a.price
            : 0,
  );
}
function canManage(c?: Course) {
  const u = state().user!;
  if (u.role !== "admin" && u.role !== "instructor")
    throw Error("Management access required.");
  if (
    c &&
    u.role === "instructor" &&
    !read().instructors.some(
      (i) => i.id === c.instructorId && i.userId === u.id,
    )
  )
    throw Error("You can edit your own courses only.");
}
function admin() {
  if (state().user?.role !== "admin")
    throw Error("Administrator access required.");
}
export const demo: Services = {
  auth: {
    async login(email, password) {
      if (password.length < 8)
        throw Error("Use at least 8 characters for demo login.");
      const s = read(),
        u = s.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!u)
        throw Error("Use a listed demo account, or create a demo profile.");
      s.current = u.id;
      save(s);
      return u;
    },
    async register(name, email, password) {
      if (password.length < 8) throw Error("Use at least 8 characters.");
      const s = read();
      if (s.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
        throw Error("This demo email is already registered.");
      const u: User = {
        ...users[0],
        id: id(),
        name,
        email: email.toLowerCase(),
        onboarding: false,
      };
      s.users.push(u);
      s.accounts[u.id] = account(u);
      s.current = u.id;
      save(s);
      return u;
    },
    async logout() {
      const s = read();
      s.current = null;
      save(s);
    },
    async session() {
      return read().current ? state().user : null;
    },
    async forgot(email) {
      const s = read();
      s.reset = { email };
      save(s);
      return {
        message: "Demo only: no email was sent. Use verification code 123456.",
      };
    },
    async verify(email, code) {
      const s = read();
      if (s.reset?.email !== email || code !== "123456")
        throw Error(
          "The demo code is 123456. Start the reset flow again if needed.",
        );
      s.reset.token = id();
      save(s);
      return { token: s.reset.token };
    },
    async reset(token, password) {
      const s = read();
      if (!token || s.reset?.token !== token || password.length < 8)
        throw Error("Invalid reset token or password.");
      delete s.reset;
      save(s);
    },
  },
  courses: {
    async listCourses(f) {
      return filterCourses(read().catalogs, f);
    },
    async getCourse(cid) {
      return course(cid);
    },
    async instructors() {
      return read().instructors;
    },
    async categories() {
      return read().categories;
    },
  },
  search: {
    async history() {
      return state().history;
    },
    async remember(q) {
      const s = read(),
        a = state();
      if (q.trim())
        a.history = [
          q.trim(),
          ...a.history.filter((x) => x !== q.trim()),
        ].slice(0, 8);
      save(s);
    },
    async clear() {
      const s = read();
      state().history = [];
      save(s);
    },
  },
  enrollments: {
    async list() {
      return state().enrollments;
    },
    async enroll(cid) {
      const c = course(cid),
        a = state(),
        s = read();
      const old = a.enrollments.find((x) => x.courseId === cid);
      if (old) return old;
      if (
        c.price > 0 &&
        !a.orders.some((o) => o.courseId === cid && o.status === "demo_paid")
      )
        throw Error("Complete the demo checkout first.");
      const e = { courseId: cid, createdAt: stamp() };
      a.enrollments.push(e);
      save(s);
      return e;
    },
  },
  progress: {
    async list() {
      return state().progress;
    },
    async update(lid, data) {
      const s = read(),
        a = state(),
        c = s.catalogs.find((c) => c.lessons.some((l) => l.id === lid));
      if (!c || !a.enrollments.some((e) => e.courseId === c.id))
        throw Error("Enroll before starting this lesson.");
      let p = a.progress.find((p) => p.lessonId === lid);
      if (!p) {
        p = {
          lessonId: lid,
          courseId: c.id,
          completed: false,
          position: 0,
          updatedAt: stamp(),
        };
        a.progress.push(p);
      }
      Object.assign(p, data, { updatedAt: stamp() });
      award();
      return p;
    },
  },
  quizzes: {
    async get(qid) {
      return course(qid).quiz;
    },
    async submit(qid, answers) {
      const a = state(),
        q = course(qid).quiz;
      if (!a.enrollments.some((e) => e.courseId === qid))
        throw Error("Enroll before taking the assessment.");
      if (
        q.questions.some(
          (x) =>
            !Number.isInteger(answers[x.id]) ||
            answers[x.id] < 0 ||
            answers[x.id] >= x.options.length,
        )
      )
        throw Error("Please answer every question.");
      const score = Math.round(
        (q.questions.filter((x) => answers[x.id] === x.correct).length /
          q.questions.length) *
          100,
      );
      const t: Attempt = {
        id: id(),
        quizId: qid,
        answers,
        score,
        passed: score >= q.passScore,
        feedback: q.questions.map((x) => ({
          id: x.id,
          correct: x.correct!,
          explanation: x.explanation!,
        })),
        createdAt: stamp(),
      };
      a.attempts.push(t);
      award();
      return t;
    },
    async attempts() {
      return state().attempts;
    },
  },
  payments: {
    async checkout(cid) {
      const c = course(cid),
        a = state(),
        s = read();
      let o = a.orders.find((o) => o.courseId === cid);
      if (!o) {
        o = {
          id: "DEMO-" + id().slice(0, 8),
          courseId: cid,
          title: c.title,
          amount: c.price,
          currency: "USD",
          status: "demo_paid",
          demo: true,
          createdAt: stamp(),
        };
        a.orders.push(o);
      }
      if (!a.enrollments.some((x) => x.courseId === cid))
        a.enrollments.push({ courseId: cid, createdAt: stamp() });
      save(s);
      return o;
    },
    async orders() {
      return state().orders;
    },
  },
  reminders: {
    async list() {
      return state().reminders;
    },
    async save(data, rid) {
      const s = read(),
        a = state();
      if (!data.title.trim() || Number.isNaN(Date.parse(data.dueAt)))
        throw Error("Enter a title and valid date.");
      const r: Reminder = { ...data, id: rid || id() };
      const i = a.reminders.findIndex((x) => x.id === r.id);
      if (i >= 0) a.reminders[i] = r;
      else a.reminders.push(r);
      save(s);
      return r;
    },
    async remove(rid) {
      const s = read(),
        a = state();
      a.reminders = a.reminders.filter((x) => x.id !== rid);
      save(s);
    },
  },
  chat: {
    async list() {
      return state().conversations;
    },
    async send(cid, text) {
      if (!text.trim()) throw Error("Enter a message.");
      const s = read(),
        a = state(),
        c = a.conversations.find((c) => c.id === cid);
      if (!c) throw Error("Conversation not found.");
      const m = {
        id: id(),
        senderId: a.user!.id,
        text: text.trim(),
        createdAt: stamp(),
        read: true,
      };
      c.messages.push(m, {
        id: id(),
        senderId: "teacher",
        text: "Demo reply: Thanks for sharing! Try one small exercise, then tell me what you discovered.",
        createdAt: stamp(),
        read: false,
      });
      save(s);
      return m;
    },
    async read(cid) {
      const s = read();
      state()
        .conversations.find((c) => c.id === cid)
        ?.messages.forEach((m) => (m.read = true));
      save(s);
    },
    async start(uid) {
      const s = read(),
        a = state();
      let c = a.conversations.find((c) => c.members.includes(uid));
      if (!c) {
        const u = s.users.find((u) => u.id === uid);
        c = {
          id: id(),
          name: u?.name || "Learning partner",
          subtitle: "Simulated conversation",
          members: [a.user!.id, uid],
          messages: [],
        };
        a.conversations.push(c);
        save(s);
      }
      return c;
    },
  },
  profile: {
    async get() {
      return read().current ? state().user : null;
    },
    async update(data) {
      const s = read(),
        u = state().user!;
      const { name, bio, avatar, publicProfile, notifications, onboarding } =
        data;
      Object.assign(
        u,
        Object.fromEntries(
          Object.entries({
            name,
            bio,
            avatar,
            publicProfile,
            notifications,
            onboarding,
          }).filter(([, v]) => v !== undefined),
        ),
      );
      save(s);
      return u;
    },
    async public(uid) {
      const s = read(),
        u = s.users.find((u) => u.id === uid) || {
          ...users[1],
          id: uid,
          name: "Jamie Wilson",
          bio: "Design enthusiast and lifelong learner.",
        };
      return {
        user: {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          publicProfile: u.publicProfile,
          bio: u.publicProfile ? u.bio : "",
        },
        certificates: u.publicProfile
          ? s.accounts[u.id]?.certificates || []
          : [],
      };
    },
  },
  certificates: {
    async list() {
      return state().certificates;
    },
    async achievements() {
      return state().achievements;
    },
  },
  notifications: {
    async save(enabled) {
      return demo.profile.update({ notifications: enabled });
    },
  },
  admin: {
    async analytics() {
      canManage();
      const s = read(),
        u = state().user!,
        managed = s.catalogs.filter(
          (c) =>
            u.role === "admin" ||
            s.instructors.some(
              (i) => i.id === c.instructorId && i.userId === u.id,
            ),
        ),
        accounts = Object.values(s.accounts),
        allOrders = accounts
          .flatMap((a) => a.orders)
          .filter((o) => managed.some((c) => c.id === o.courseId)),
        enrollments = accounts
          .flatMap((a) => a.enrollments)
          .filter((e) => managed.some((c) => c.id === e.courseId));
      return {
        users: u.role === "admin" ? s.users.length : enrollments.length,
        enrollments: enrollments.length,
        revenue: allOrders.reduce((t, o) => t + o.amount, 0),
        completion: accounts
          .flatMap((a) => a.certificates)
          .filter((c) => managed.some((m) => m.id === c.courseId)).length,
        courses: managed.map((c) => ({
          id: c.id,
          title: c.title,
          students: enrollments.filter((e) => e.courseId === c.id).length,
          completed: accounts.filter((a) =>
            a.certificates.some((x) => x.courseId === c.id),
          ).length,
        })),
        orders: allOrders,
        usersList: u.role === "admin" ? s.users : [],
        audits: [],
      };
    },
    async courses() {
      canManage();
      return read().catalogs.filter(
        (c) =>
          state().user!.role === "admin" ||
          read().instructors.some(
            (i) => i.id === c.instructorId && i.userId === state().user!.id,
          ),
      );
    },
    async saveCourse(c) {
      const s = read(),
        old = s.catalogs.find((x) => x.id === c.id);
      canManage(old);
      canManage(c);
      if (
        !c.title.trim() ||
        c.price < 0 ||
        !c.lessons.length ||
        !c.quiz.questions.length
      )
        throw Error("Add a title, valid price, lessons and quiz.");
      const i = s.catalogs.findIndex((x) => x.id === c.id);
      if (i >= 0) s.catalogs[i] = structuredClone(c);
      else s.catalogs.push(structuredClone(c));
      save(s);
      return c;
    },
    async setRole(uid, role) {
      admin();
      if (uid === state().user!.id)
        throw Error("You cannot change your own role.");
      const s = read(),
        u = s.users.find((u) => u.id === uid)!;
      u.role = role as User["role"];
      if (role === "instructor" && !s.instructors.some((i) => i.userId === uid))
        s.instructors.push({
          id: uid,
          userId: uid,
          name: u.name,
          title: "Instructor",
          bio: u.bio,
          color: "blue",
          initials: u.name.slice(0, 2),
        });
      save(s);
      return u;
    },
    async saveCategory(name) {
      admin();
      const s = read();
      if (name.trim() && !s.categories.includes(name.trim()))
        s.categories.push(name.trim());
      save(s);
      return s.categories;
    },
    async saveInstructor(i) {
      admin();
      const s = read(),
        n = s.instructors.findIndex((x) => x.id === i.id);
      if (n >= 0) s.instructors[n] = i;
      else s.instructors.push(i);
      save(s);
      return i;
    },
    async saveBadge(b) {
      admin();
      const s = read(),
        n = s.badges.findIndex((x) => x.id === b.id);
      if (n >= 0) s.badges[n] = b;
      else s.badges.push(b);
      save(s);
      return b;
    },
    async badges() {
      canManage();
      return read().badges;
    },
    async moderate(cid, mid) {
      admin();
      const s = read();
      Object.values(s.accounts).forEach((a) =>
        a.conversations
          .filter((c) => c.id === cid)
          .forEach(
            (c) => (c.messages = c.messages.filter((m) => m.id !== mid)),
          ),
      );
      save(s);
    },
  },
  async snapshot() {
    if (!read().current)
      return {
        ...account(users[0]),
        user: null,
        enrollments: [],
        progress: [],
        reminders: [],
        conversations: [],
      };
    return structuredClone(state());
  },
  async resetDemo() {
    memory = initial();
    save(memory);
  },
};
export function resetDemoMemoryForTests() {
  memory = undefined;
}
