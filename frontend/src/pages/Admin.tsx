import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  DollarSign,
  Edit3,
  GraduationCap,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import {
  useAction,
  useInstructors,
  useWorkspace,
  services,
  MODE,
} from "../hooks";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Money,
  PageTitle,
  Pill,
  SectionTitle,
} from "../components/ui";
import type {
  Badge,
  Course,
  Instructor,
  Question,
  Conversation,
} from "../types";
import { request } from "../services/api";
import { createId } from "../id";
export function Admin() {
  const { data: s } = useWorkspace();
  const {
    data: a,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => services.admin.analytics(),
  });
  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => services.admin.courses(),
  });
  const { data: badges } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: () => services.admin.badges(),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => services.courses.categories(),
  });
  const { data: instructors } = useInstructors();
  const { data: chats } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () =>
      MODE === "demo"
        ? services.chat.list()
        : request<Conversation[]>("/admin/conversations"),
    enabled: s?.user?.role === "admin",
  });
  const [tab, setTab] = useState("Overview"),
    [category, setCategory] = useState("");
  const act = useAction();
  if (isLoading) return <Loading />;
  if (error || !a) return <ErrorState error={error} retry={refetch} />;
  const isAdmin = s?.user?.role === "admin";
  return (
    <>
      <PageTitle
        eyebrow={isAdmin ? "ADMINISTRATION" : "INSTRUCTOR WORKSPACE"}
        title="Make great learning happen"
        description="A thoughtful space to manage your courses and community."
        action={
          <Link className="btn primary" to="/admin/courses/new">
            <Plus size={16} />
            Create course
          </Link>
        }
      />
      <div className="tabs">
        {[
          "Overview",
          "Courses",
          ...(isAdmin ? ["People", "Catalog", "Badges", "Moderation"] : []),
          "Payments",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-icon">
                <Users size={20} />
              </span>
              <div>
                <strong>{a.enrollments}</strong>
                <p>Course enrollments</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon mint">
                <GraduationCap size={20} />
              </span>
              <div>
                <strong>{a.completion}</strong>
                <p>Certificates issued</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon peach">
                <DollarSign size={20} />
              </span>
              <div>
                <strong>
                  <Money value={a.revenue} />
                </strong>
                <p>
                  {MODE === "demo" ? "Simulated revenue" : "Verified revenue"}
                </p>
              </div>
            </div>
          </div>
          <section className="panel">
            <SectionTitle title="Course performance" />
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Enrolled</th>
                    <th>Completed</th>
                    <th>Completion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {a.courses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>{c.students}</td>
                      <td>{c.completed}</td>
                      <td>
                        {c.students
                          ? Math.round((c.completed / c.students) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="Recent administrative activity" />
            {a.audits.length ? (
              a.audits.map((e) => (
                <p key={e.id} style={{ fontSize: 12, margin: "10px 0" }}>
                  {e.action} · {new Date(e.createdAt).toLocaleString()}
                </p>
              ))
            ) : (
              <p style={{ fontSize: 12 }}>
                No audit events in this workspace yet.
              </p>
            )}
          </section>
        </>
      )}
      {tab === "Courses" && (
        <section className="panel">
          <SectionTitle title="Your teaching library" />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Lessons</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {courses?.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>
                      <Money value={c.price} />
                    </td>
                    <td>
                      <Pill tone={c.published ? "green" : "orange"}>
                        {c.published ? "Published" : "Draft"}
                      </Pill>
                    </td>
                    <td>{c.lessons.length}</td>
                    <td>
                      <Link
                        className="btn secondary"
                        to={"/admin/courses/" + c.id}
                      >
                        <Edit3 size={14} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "People" && (
        <section className="panel">
          <SectionTitle
            title="Your learning community"
            description="Role changes are enforced by the API. You cannot change your own role."
          />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {a.usersList.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="input"
                        aria-label={"Role for " + u.name}
                        disabled={u.id === s?.user?.id}
                        value={u.role}
                        onChange={(e) =>
                          act(
                            () => services.admin.setRole(u.id, e.target.value),
                            "Role updated.",
                          )
                        }
                      >
                        <option value="learner">Learner</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "Catalog" && (
        <div className="two-col">
          <section className="panel">
            <SectionTitle title="Course categories" />
            <div className="chips">
              {categories?.map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await services.admin.saveCategory(category);
                  setCategory("");
                }, "Category added.");
              }}
            >
              <label className="field">
                New category
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={60}
                  minLength={2}
                  required
                />
              </label>
              <Button>Add category</Button>
            </form>
          </section>
          <section className="panel">
            <SectionTitle title="Instructor profiles" />
            {instructors?.map((i) => (
              <InstructorEditor key={i.id} instructor={i} />
            ))}
          </section>
        </div>
      )}
      {tab === "Badges" && (
        <section className="panel">
          <SectionTitle
            title="Achievement rules"
            description="Course certificates require every current lesson plus a passing quiz attempt. Quiz pass scores are edited within each course."
          />
          {badges?.map((b) => (
            <BadgeEditor key={b.id} badge={b} />
          ))}
        </section>
      )}
      {tab === "Moderation" && (
        <section className="panel">
          <SectionTitle
            title="Community moderation"
            description="Administrators can remove inappropriate messages. Deletions are audited in API mode."
          />
          {chats?.map((c) => (
            <details key={c.id}>
              <summary>
                {c.name} · {c.messages.length} messages
              </summary>
              {c.messages.map((m) => (
                <div className="lesson-row" key={m.id}>
                  <p
                    style={{
                      fontSize: 12,
                      maxWidth: "85%",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {m.text}
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm("Remove this message?"))
                        void act(
                          () => services.admin.moderate(c.id, m.id),
                          "Message removed.",
                        );
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </details>
          ))}
          {!chats?.length && <p>No conversations to review.</p>}
        </section>
      )}
      {tab === "Payments" && (
        <section className="panel">
          <SectionTitle
            title="Payment records"
            description={
              MODE === "demo"
                ? "These transactions are simulated."
                : "Only provider-verified orders are counted as revenue."
            }
          />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Course</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {a.orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.title}</td>
                    <td>
                      <Money value={o.amount} />
                    </td>
                    <td>{o.status}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!a.orders.length && (
            <Empty
              title="No payment records yet"
              description="Completed transactions will appear here."
            />
          )}
        </section>
      )}
    </>
  );
}
function InstructorEditor({ instructor }: { instructor: Instructor }) {
  const [value, setValue] = useState(instructor);
  const act = useAction();
  return (
    <details>
      <summary>{value.name}</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(
            () => services.admin.saveInstructor(value),
            "Instructor updated.",
          );
        }}
      >
        <label className="field">
          Name
          <input
            required
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label className="field">
          Title
          <input
            required
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </label>
        <label className="field">
          Biography
          <textarea
            value={value.bio}
            onChange={(e) => setValue({ ...value, bio: e.target.value })}
          />
        </label>
        <Button>Save instructor</Button>
      </form>
    </details>
  );
}
function BadgeEditor({ badge }: { badge: Badge }) {
  const [value, setValue] = useState(badge);
  const act = useAction();
  return (
    <form
      className="editor-item"
      onSubmit={(e) => {
        e.preventDefault();
        void act(() => services.admin.saveBadge(value), "Badge rule saved.");
      }}
    >
      <div className="form-grid">
        <label className="field">
          Badge name
          <input
            required
            maxLength={100}
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </label>
        <label className="field">
          Threshold (
          {value.kind === "quiz"
            ? "score %"
            : value.kind === "lesson"
              ? "completed lessons"
              : "completed courses"}
          )
          <input
            required
            type="number"
            min={1}
            max={value.kind === "quiz" ? 100 : 1000}
            value={value.threshold}
            onChange={(e) =>
              setValue({ ...value, threshold: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <label className="field">
        Description
        <input
          required
          value={value.description}
          onChange={(e) => setValue({ ...value, description: e.target.value })}
        />
      </label>
      <Button variant="secondary">Save rule</Button>
    </form>
  );
}
export function CourseEditor() {
  const { courseId = "new" } = useParams();
  const {
    data: courses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => services.admin.courses(),
  });
  const { data: instructors } = useInstructors(),
    { data: s } = useWorkspace();
  if (isLoading || !instructors) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const owned = instructors.filter(
    (i) => s?.user?.role === "admin" || i.userId === s?.user?.id,
  );
  if (!owned.length)
    return (
      <Empty
        title="An instructor profile is required"
        description="Ask an administrator to assign an instructor role first."
      />
    );
  const c = courses?.find((c) => c.id === courseId);
  if (courseId !== "new" && !c)
    return (
      <Empty
        title="Course unavailable"
        description="You can manage only courses assigned to your instructor profile."
      />
    );
  return <CourseForm key={courseId} initial={c} instructors={owned} />;
}
function CourseForm({
  initial,
  instructors,
}: {
  initial?: Course;
  instructors: Instructor[];
}) {
  const [course, setCourse] = useState<Course>(() =>
    initial
      ? structuredClone(initial)
      : {
          id: "course-" + createId().slice(0, 8),
          title: "",
          category: "Design",
          instructorId: instructors[0].id,
          price: 0,
          level: "Beginner",
          rating: 0,
          students: 0,
          color: "blue",
          art: "code",
          description: "",
          language: "English",
          published: false,
          duration: 10,
          outcomes: [""],
          requirements: ["A browser and curiosity"],
          lessons: [],
          quiz: {
            id: "",
            title: "Knowledge check",
            passScore: 75,
            questions: [],
          },
        },
  );
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => services.courses.categories(),
  });
  const [busy, setBusy] = useState(false);
  const act = useAction(),
    navigate = useNavigate();
  function patch(data: Partial<Course>) {
    setCourse((c) => ({ ...c, ...data }));
  }
  function updateQuestion(i: number, p: Partial<Question>) {
    patch({
      quiz: {
        ...course.quiz,
        questions: course.quiz.questions.map((q, j) =>
          i === j ? { ...q, ...p } : q,
        ),
      },
    });
  }
  return (
    <div className="management-editor">
      <Link to="/admin" className="text-link">
        <ArrowLeft size={15} />
        Back to studio
      </Link>
      <PageTitle
        title={
          initial
            ? "Shape your next great lesson"
            : "Create something worth learning"
        }
        description="Manage the course, curriculum, and assessment in one place."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await act(async () => {
            await services.admin.saveCourse({
              ...course,
              duration: course.lessons.reduce((n, l) => n + l.minutes, 0),
              quiz: { ...course.quiz, id: course.id },
              outcomes: course.outcomes.filter(Boolean),
            });
            navigate("/admin");
          }, "Course saved.");
          setBusy(false);
        }}
      >
        <section className="panel">
          <SectionTitle title="Course essentials" />
          <label className="field">
            Title
            <input
              required
              minLength={4}
              maxLength={160}
              value={course.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label className="field">
            Description
            <textarea
              required
              minLength={15}
              maxLength={5000}
              value={course.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Category
              <select
                value={course.category}
                onChange={(e) => patch({ category: e.target.value })}
              >
                {categories?.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Instructor
              <select
                value={course.instructorId}
                onChange={(e) => patch({ instructorId: e.target.value })}
              >
                {instructors.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Price in USD
              <input
                type="number"
                min={0}
                max={10000}
                step="0.01"
                required
                value={course.price}
                onChange={(e) => patch({ price: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              Level
              <select
                value={course.level}
                onChange={(e) => patch({ level: e.target.value })}
              >
                {["Beginner", "Intermediate", "Advanced"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Cover palette
              <select
                value={course.color}
                onChange={(e) => patch({ color: e.target.value })}
              >
                {["blue", "peach", "mint", "yellow", "lavender", "rose"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              Cover illustration
              <select
                value={course.art}
                onChange={(e) => patch({ art: e.target.value })}
              >
                {["code", "design", "data", "photo", "brand", "python"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="field">
            Learning outcomes (one per line)
            <textarea
              required
              value={course.outcomes.join("\n")}
              onChange={(e) => patch({ outcomes: e.target.value.split("\n") })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={course.published}
              onChange={(e) => patch({ published: e.target.checked })}
            />
            Publish in the course catalog
          </label>
        </section>
        <section className="panel">
          <SectionTitle
            title="Your curriculum"
            action={
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  patch({
                    lessons: [
                      ...course.lessons,
                      {
                        id: course.id + "-" + createId().slice(0, 8),
                        title: "",
                        section: "Foundations",
                        minutes: 10,
                        content: "",
                        exercise: "",
                        videoUrl: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add lesson
              </Button>
            }
          />
          {course.lessons.map((l, i) => (
            <div className="editor-item" key={l.id}>
              <div className="section-title">
                <h3>Lesson {i + 1}</h3>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this lesson? Existing learner progress for it will be removed in API mode.",
                      )
                    )
                      patch({
                        lessons: course.lessons.filter((x) => x.id !== l.id),
                      });
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              {(
                ["title", "section", "content", "exercise", "videoUrl"] as const
              ).map((field) => (
                <label className="field" key={field}>
                  {field === "videoUrl"
                    ? "Licensed video URL (optional, HTTPS)"
                    : field[0].toUpperCase() + field.slice(1)}
                  {["content", "exercise"].includes(field) ? (
                    <textarea
                      required
                      value={l[field]}
                      onChange={(e) =>
                        patch({
                          lessons: course.lessons.map((x, j) =>
                            j === i ? { ...x, [field]: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  ) : (
                    <input
                      type={field === "videoUrl" ? "url" : "text"}
                      required={field !== "videoUrl"}
                      value={l[field]}
                      onChange={(e) =>
                        patch({
                          lessons: course.lessons.map((x, j) =>
                            j === i ? { ...x, [field]: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  )}
                </label>
              ))}
              <label className="field">
                Estimated minutes
                <input
                  type="number"
                  min={1}
                  max={600}
                  required
                  value={l.minutes}
                  onChange={(e) =>
                    patch({
                      lessons: course.lessons.map((x, j) =>
                        j === i ? { ...x, minutes: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          {!course.lessons.length && (
            <p>Add at least one lesson before saving.</p>
          )}
        </section>
        <section className="panel">
          <SectionTitle
            title="The knowledge check"
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  patch({
                    quiz: {
                      ...course.quiz,
                      questions: [
                        ...course.quiz.questions,
                        {
                          id: course.id + "-q" + createId().slice(0, 8),
                          text: "",
                          options: ["", "", "", ""],
                          correct: 0,
                          explanation: "",
                        },
                      ],
                    },
                  })
                }
              >
                <Plus size={15} />
                Add question
              </Button>
            }
          />
          <label className="field">
            Passing score (%)
            <input
              type="number"
              min={1}
              max={100}
              required
              value={course.quiz.passScore}
              onChange={(e) =>
                patch({
                  quiz: { ...course.quiz, passScore: Number(e.target.value) },
                })
              }
            />
          </label>
          {course.quiz.questions.map((q, i) => (
            <div className="editor-item" key={q.id}>
              <div className="section-title">
                <h3>Question {i + 1}</h3>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    patch({
                      quiz: {
                        ...course.quiz,
                        questions: course.quiz.questions.filter(
                          (x) => x.id !== q.id,
                        ),
                      },
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <label className="field">
                Question
                <input
                  required
                  value={q.text}
                  onChange={(e) => updateQuestion(i, { text: e.target.value })}
                />
              </label>
              {q.options.map((o, j) => (
                <label className="field" key={j}>
                  Option {j + 1}
                  <input
                    required
                    value={o}
                    onChange={(e) =>
                      updateQuestion(i, {
                        options: q.options.map((x, k) =>
                          k === j ? e.target.value : x,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label className="field">
                Correct option
                <select
                  value={q.correct}
                  onChange={(e) =>
                    updateQuestion(i, { correct: Number(e.target.value) })
                  }
                >
                  {q.options.map((_, j) => (
                    <option key={j} value={j}>
                      Option {j + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Explanation
                <textarea
                  required
                  value={q.explanation}
                  onChange={(e) =>
                    updateQuestion(i, { explanation: e.target.value })
                  }
                />
              </label>
            </div>
          ))}
          {!course.quiz.questions.length && (
            <p>Add at least one question before saving.</p>
          )}
        </section>
        <div className="button-row space-top">
          <Button
            disabled={
              busy || !course.lessons.length || !course.quiz.questions.length
            }
          >
            <Save size={16} />
            {busy ? "Saving…" : "Save course"}
          </Button>
          <Link className="btn secondary" to="/admin">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
