import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Filter,
  Flame,
  GraduationCap,
  Palette,
  Play,
  Search,
  SlidersHorizontal,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import {
  useAction,
  useCatalog,
  useInstructors,
  useWorkspace,
  services,
  MODE,
} from "../hooks";
import {
  Avatar,
  BrandBackground,
  Button,
  CourseArt,
  CourseCard,
  Empty,
  ErrorState,
  Loading,
  Money,
  PageTitle,
  Pill,
  ProgressBar,
  SectionTitle,
} from "../components/ui";
import type { Course, Filters } from "../types";
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-orbit" />
      <div className="hero-book" />
      <span className="hero-spark">✧</span>
      <div className="floating-chip">
        <GraduationCap size={28} />
      </div>
    </div>
  );
}
export function Home() {
  const { data: s, isLoading, error, refetch } = useWorkspace(),
    {
      data: catalog,
      error: catalogError,
      refetch: refetchCatalog,
    } = useCatalog(),
    { data: instructors } = useInstructors();
  if (error || catalogError)
    return (
      <ErrorState
        error={error || catalogError}
        retry={() => {
          void refetch();
          void refetchCatalog();
        }}
      />
    );
  if (isLoading || !catalog) return <Loading />;
  const enrolled = catalog.filter((c) =>
    s?.enrollments.some((e) => e.courseId === c.id),
  );
  const done = s?.progress.filter((p) => p.completed).length || 0;
  const minutes =
    s?.progress.reduce((n, p) => n + Math.round(p.position / 60), 0) || 0;
  const today = new Date();
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const activeDays = new Set(
    s?.progress
      .filter((p) => new Date(p.updatedAt) >= weekStart)
      .map((p) => (new Date(p.updatedAt).getDay() + 6) % 7),
  );
  return (
    <>
      <PageTitle
        title={`Keep growing, ${s?.user?.name.split(" ")[0] || "learner"} 👋`}
        description="A new day. A new idea. A little closer to your goals."
        action={
          <span className="muted nowrap" style={{ fontSize: 11 }}>
            {today.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        }
      />
      <div className="dashboard-grid">
        <div>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">BIG IDEAS START WITH A SMALL STEP</div>
              <h2>
                Your next chapter
                <br />
                starts right here.
              </h2>
              <p>
                Learn a new skill, follow your curiosity, and make room for
                what’s next.
              </p>
              <Link className="btn white" to="/explore">
                Explore courses <ArrowRight size={14} />
              </Link>
            </div>
            <HeroArt />
          </section>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-icon">
                <BookOpen size={19} />
              </span>
              <div>
                <strong>{enrolled.length.toString().padStart(2, "0")}</strong>
                <p>Courses enrolled</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon mint">
                <Check size={19} />
              </span>
              <div>
                <strong>{done.toString().padStart(2, "0")}</strong>
                <p>Lessons completed</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon peach">
                <Trophy size={19} />
              </span>
              <div>
                <strong>
                  {(s?.achievements.length || 0).toString().padStart(2, "0")}
                </strong>
                <p>Badges earned</p>
              </div>
            </div>
          </div>
          <section className="dashboard-section">
            <SectionTitle
              title="Pick up where you left off"
              action={
                <Link to="/my-learning">
                  View my learning <ArrowRight size={14} />
                </Link>
              }
            />
            {enrolled.length ? (
              <div className="course-grid two">
                {enrolled.slice(0, 2).map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    instructor={
                      instructors?.find((i) => i.id === c.instructorId)?.name
                    }
                    progress={
                      (100 *
                        (s?.progress.filter(
                          (p) => p.courseId === c.id && p.completed,
                        ).length || 0)) /
                      c.lessons.length
                    }
                  />
                ))}
              </div>
            ) : (
              <Empty
                title="Your next chapter is waiting"
                action={
                  <Link className="btn primary" to="/explore">
                    Find a course
                  </Link>
                }
              />
            )}
          </section>
          <section>
            <SectionTitle
              title="A little inspiration for you"
              description="Fresh perspectives. Practical skills. Endless possibilities."
              action={
                <Link to="/explore">
                  View all <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="course-grid two">
              {catalog
                .filter((c) => !enrolled.some((e) => e.id === c.id))
                .slice(0, 4)
                .map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    instructor={
                      instructors?.find((i) => i.id === c.instructorId)?.name
                    }
                  />
                ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="panel right-panel">
            <div className="section-title">
              <h3>Your weekly rhythm</h3>
              <Flame size={17} color="#dfa979" />
            </div>
            <div
              className="goal-ring"
              style={
                {
                  "--value": Math.min(100, (activeDays.size / 5) * 100) + "%",
                } as React.CSSProperties
              }
            >
              <div className="goal-ring-inner">
                <strong>
                  {activeDays.size}
                  <span style={{ fontSize: 16 }}> / 5</span>
                </strong>
                <span>active learning days</span>
              </div>
            </div>
            <p className="goal-caption">
              <strong>Small steps add up.</strong>
              <br />
              Aim for five learning days this week.
            </p>
            <div className="week-days">
              {dayNames.map((d, i) => (
                <div key={i}>
                  <span>{d}</span>
                  <span
                    className={"day-dot " + (activeDays.has(i) ? "done" : "")}
                  >
                    {activeDays.has(i) ? <Check size={11} /> : <span>·</span>}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel right-panel">
            <SectionTitle
              title="Coming up"
              action={
                <Link to="/reminders">
                  <ChevronRight size={16} />
                </Link>
              }
            />
            {s?.reminders
              .filter((r) => !r.completed)
              .slice(0, 3)
              .map((r) => (
                <Link
                  key={r.id}
                  className="mini-reminder"
                  to={"/reminders/" + r.id}
                >
                  <span className="date-square">
                    {new Date(r.dueAt)
                      .toLocaleString("en", { month: "short" })
                      .toUpperCase()}
                    <strong>{new Date(r.dueAt).getDate()}</strong>
                  </span>
                  <div>
                    <h4>{r.title}</h4>
                    <p>
                      {new Date(r.dueAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · Study reminder
                    </p>
                  </div>
                </Link>
              ))}
            {!s?.reminders.some((r) => !r.completed) && (
              <p style={{ fontSize: 11 }}>
                A clear calendar. Make time for your next lesson.
              </p>
            )}
            <Link to="/reminders/new" className="text-link space-top">
              + Add a reminder
            </Link>
          </section>
          <section className="panel right-panel">
            <h3>Learn from people who care</h3>
            {instructors?.slice(0, 2).map((i) => (
              <Link
                to={"/instructors/" + i.id}
                className="mentor-row"
                key={i.id}
              >
                <Avatar name={i.name} />
                <div>
                  <strong>{i.name}</strong>
                  <p>{i.title}</p>
                </div>
                <ChevronRight size={13} />
              </Link>
            ))}
          </section>
          <section className="panel right-panel tip-panel">
            <span className="tip-star">✦</span>
            <h3>Curiosity looks good on you.</h3>
            <p>Ten focused minutes can be the beginning of something great.</p>
            <Link to="/explore/paths" className="text-link space-top">
              Find your path <ArrowRight size={13} />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
export function Explore({ variant = "all" }: { variant?: string }) {
  const { data: catalog, isLoading, error, refetch } = useCatalog(),
    { data: instructors } = useInstructors();
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  return (
    <>
      <PageTitle
        eyebrow="A WORLD OF POSSIBILITY"
        title={
          variant === "paths"
            ? "Find your learning path"
            : variant === "instructors"
              ? "Great teachers. Fresh perspectives."
              : "What will you learn next?"
        }
        description="Made for curious minds and everyday ambition."
      />
      <div className="tabs">
        <Link className={variant === "all" ? "active" : ""} to="/explore">
          All courses
        </Link>
        <Link
          className={variant === "paths" ? "active" : ""}
          to="/explore/paths"
        >
          Learning paths
        </Link>
        <Link
          className={variant === "instructors" ? "active" : ""}
          to="/explore/instructors"
        >
          Our instructors
        </Link>
      </div>
      {variant === "instructors" ? (
        <div className="course-grid">
          {instructors?.map((i) => (
            <article className="panel" key={i.id}>
              <Avatar name={i.name} size="lg" />
              <h2 className="space-top">{i.name}</h2>
              <p style={{ fontSize: 12, margin: "10px 0" }}>{i.title}</p>
              <p style={{ fontSize: 12 }}>{i.bio}</p>
              <Link className="text-link space-top" to={"/instructors/" + i.id}>
                Meet your instructor <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      ) : variant === "paths" ? (
        <div className="course-grid">
          {[
            "Design",
            "Development",
            "Data Science",
            "Photography",
            "Business",
          ].map((cat, i) => (
            <article className="panel" key={cat}>
              <span className="stat-icon">
                {i % 2 ? <Code2 /> : <Palette />}
              </span>
              <h2 className="space-top">{cat}</h2>
              <p style={{ fontSize: 12, margin: "12px 0" }}>
                A practical starting point, one thoughtful lesson at a time.
              </p>
              <p>
                {catalog?.filter((c) => c.category === cat).length} courses ·
                Beginner friendly
              </p>
              <Link
                className="btn secondary space-top"
                to={"/results?category=" + encodeURIComponent(cat)}
              >
                Explore this path <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/results?q=" + encodeURIComponent(q));
            }}
          >
            <Search size={20} />
            <input
              aria-label="Find courses"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “design”, “React”, or an instructor’s name"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="chips">
            {["All", ...new Set(catalog?.map((c) => c.category))].map((c) => (
              <button
                className={"chip " + (category === c ? "active" : "")}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="search-tools">
            <span>
              {
                catalog?.filter(
                  (c) => category === "All" || c.category === category,
                ).length
              }{" "}
              courses to spark your curiosity
            </span>
            <Link className="btn secondary" to="/filters">
              <SlidersHorizontal size={15} />
              All filters
            </Link>
          </div>
          <div className="course-grid">
            {catalog
              ?.filter((c) => category === "All" || c.category === category)
              .map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  instructor={
                    instructors?.find((i) => i.id === c.instructorId)?.name
                  }
                />
              ))}
          </div>
        </>
      )}
    </>
  );
}
export function SearchPage({ variant = "results" }: { variant?: string }) {
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(params.entries()) as Filters;
  const [q, setQ] = useState(f.q || "");
  const act = useAction();
  const { data: s } = useWorkspace();
  const navigate = useNavigate();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => services.courses.categories(),
  });
  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["search", params.toString()],
    queryFn: () => services.courses.listCourses(f),
  });
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  }
  const filters = (
    <>
      <h3 style={{ marginBottom: 20 }}>Refine your search</h3>
      {[
        ["category", "Category", categories || []],
        ["level", "Level", ["Beginner", "Intermediate", "Advanced"]],
        ["rating", "Minimum rating", ["4", "4.5", "4.8"]],
        ["duration", "Duration", ["short", "long"]],
        ["price", "Price", ["free", "paid"]],
      ].map(([key, label, choices]) => (
        <label className="field" key={key as string}>
          {label as string}
          <select
            value={f[key as keyof Filters] || ""}
            onChange={(e) => setFilter(key as string, e.target.value)}
          >
            <option value="">Any {(label as string).toLowerCase()}</option>
            {(choices as string[]).map((o) => (
              <option key={o} value={o}>
                {o === "short"
                  ? "Up to 1 hour"
                  : o === "long"
                    ? "Over 1 hour"
                    : o}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Button
        variant="ghost"
        className="wide"
        onClick={() => {
          setQ("");
          setParams({});
        }}
      >
        Clear all filters
      </Button>
    </>
  );
  return (
    <>
      <PageTitle
        title={
          variant === "search"
            ? "Follow your curiosity"
            : variant === "filters"
              ? "Find the right fit"
              : "Your next great discovery"
        }
        description="Search by subject, skill, course title, or instructor."
      />
      <form
        className="search-box"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter("q", q);
          if (s?.user) void act(() => services.search.remember(q));
          if (variant === "search")
            navigate("/results?q=" + encodeURIComponent(q));
        }}
      >
        <Search size={20} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search courses"
          placeholder="What would you like to learn?"
        />
        <Button>Search</Button>
      </form>
      {variant === "search" && !!s?.history.length && (
        <section className="panel space-top">
          <SectionTitle
            title="Recent searches"
            action={
              <button
                className="text-link"
                onClick={() => act(() => services.search.clear())}
              >
                Clear history
              </button>
            }
          />
          <div className="chips">
            {s.history.map((q) => (
              <Link
                key={q}
                className="chip"
                to={"/results?q=" + encodeURIComponent(q)}
              >
                {q}
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="filter-layout space-top">
        <aside className="panel filter-panel">{filters}</aside>
        <section>
          <div className="search-tools">
            <span>{results?.length || 0} matching courses</span>
            <label className="checkbox-label">
              Sort by{" "}
              <select
                className="input"
                style={{ width: "auto" }}
                value={f.sort || ""}
                onChange={(e) => setFilter("sort", e.target.value)}
              >
                <option value="">Relevance</option>
                <option value="rating">Highest rated</option>
                <option value="popular">Most popular</option>
                <option value="price">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
          {isLoading ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} retry={refetch} />
          ) : results?.length ? (
            <div className="course-grid two">
              {results.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <Empty
              title="No courses found"
              description="Try another keyword or remove a filter."
              action={
                <Button
                  onClick={() => {
                    setQ("");
                    setParams({});
                  }}
                >
                  Reset search
                </Button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
export function CourseDetails() {
  const { courseId = "" } = useParams();
  const {
    data: c,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => services.courses.getCourse(courseId),
  });
  const { data: s } = useWorkspace(),
    { data: instructors } = useInstructors();
  const [tab, setTab] = useState("Overview");
  const act = useAction(),
    navigate = useNavigate();
  if (isLoading) return <Loading />;
  if (error || !c) return <ErrorState error={error} retry={refetch} />;
  const instructor = instructors?.find((i) => i.id === c.instructorId);
  const enrolled = s?.enrollments.some((e) => e.courseId === c.id);
  async function start() {
    if (!s?.user) {
      navigate("/login");
      return;
    }
    if (enrolled) navigate("/learning/" + c!.id + "/playlist");
    else if (c!.price) navigate("/checkout/" + c!.id);
    else
      await act(async () => {
        await services.enrollments.enroll(c!.id);
        navigate("/learning/" + c!.id + "/playlist");
      }, "You’re enrolled. Let’s begin!");
  }
  return (
    <>
      <Link to="/explore" className="text-link" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} />
        Back to courses
      </Link>
      <div className="detail-grid">
        <div>
          <section className="detail-cover">
            <CourseArt course={c} large />
            <div className="detail-meta">
              <Pill>{c.category}</Pill>
              <span>
                <Star size={14} fill="#e8b45a" color="#e8b45a" />
                {c.rating} · {c.students.toLocaleString()} catalog learners
              </span>
              <span>{c.level}</span>
            </div>
            <h1>{c.title}</h1>
            <p>{c.description}</p>
            {instructor && (
              <Link to={"/instructors/" + instructor.id} className="mentor-row">
                <Avatar name={instructor.name} />
                <div>
                  <strong>{instructor.name}</strong>
                  <p>{instructor.title}</p>
                </div>
              </Link>
            )}
          </section>
          <div className="tabs">
            {["Overview", "Curriculum", "Instructor"].map((t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Overview" ? (
            <section className="panel">
              <h2>What you’ll learn</h2>
              <ul className="checklist">
                {c.outcomes.map((o) => (
                  <li key={o}>
                    <Check size={17} />
                    {o}
                  </li>
                ))}
              </ul>
              <hr />
              <h3>Before you begin</h3>
              <ul className="checklist">
                {c.requirements.map((r) => (
                  <li key={r}>
                    <ChevronRight size={16} />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : tab === "Curriculum" ? (
            <section className="panel">
              <SectionTitle
                title="Your learning journey"
                description={`${c.lessons.length} original sample lessons · ${c.duration} minutes`}
              />
              {c.lessons.map((l, i) => (
                <details key={l.id}>
                  <summary>
                    {i + 1}. {l.title}
                    <span
                      className="muted"
                      style={{ float: "right", fontSize: 11 }}
                    >
                      {l.minutes} min
                    </span>
                  </summary>
                  <p style={{ fontSize: 12, paddingBottom: 15 }}>
                    {l.section} · {l.exercise}
                  </p>
                  {enrolled && (
                    <Link
                      className="text-link"
                      to={`/learning/${c.id}/lesson/${l.id}`}
                    >
                      Open lesson <ArrowRight size={13} />
                    </Link>
                  )}
                </details>
              ))}
            </section>
          ) : (
            <section className="panel">
              <h2>{instructor?.name}</h2>
              <p className="space-top">{instructor?.bio}</p>
              <Link
                className="btn secondary space-top"
                to={"/instructors/" + c.instructorId}
              >
                View instructor profile
              </Link>
            </section>
          )}
        </div>
        <aside className="panel detail-sidebar">
          <Pill tone="green">
            {enrolled ? "In your learning library" : "Make your next move"}
          </Pill>
          <div className="price-big">
            {c.price ? <Money value={c.price} /> : "Free"}{" "}
            <small>
              {c.price ? "one-time course purchase" : "forever curious"}
            </small>
          </div>
          <Button className="wide" onClick={start}>
            {enrolled
              ? "Continue learning"
              : c.price
                ? "Enroll in course"
                : "Start learning for free"}
            <ArrowRight size={16} />
          </Button>
          <Link
            className="btn secondary wide"
            style={{ marginTop: 10 }}
            to={"/share/" + c.id}
          >
            Share with a friend
          </Link>
          <hr />
          <h3>This course includes</h3>
          <ul className="checklist">
            <li>
              <Play size={17} />
              {c.lessons.length} guided lessons
            </li>
            <li>
              <Clock size={17} />
              {c.duration} minutes of learning
            </li>
            <li>
              <BookOpen size={17} />
              Practical exercises & assessment
            </li>
            <li>
              <Trophy size={17} />
              Completion certificate
            </li>
            <li>
              <Compass size={17} />
              {c.language} · Learn at your pace
            </li>
          </ul>
          <p style={{ fontSize: 10 }}>
            Complete all lessons and score {c.quiz.passScore}% or higher to earn
            your certificate.
          </p>
          {MODE === "demo" && (
            <div className="inline-note">
              Demo checkout is simulated. No money is charged.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
export function InstructorProfile() {
  const { instructorId = "" } = useParams();
  const { data: instructors } = useInstructors(),
    { data: courses } = useCatalog();
  const navigate = useNavigate(),
    act = useAction();
  const instructor = instructors?.find((i) => i.id === instructorId);
  if (!instructors) return <Loading />;
  if (!instructor) return <Empty title="Instructor not found" />;
  return (
    <>
      <section className="panel profile-header">
        <Avatar name={instructor.name} size="xl" />
        <div>
          <Pill>Meet your instructor</Pill>
          <h1 className="space-top">{instructor.name}</h1>
          <p>{instructor.title}</p>
          <p>{instructor.bio}</p>
        </div>
        <Button
          onClick={() =>
            act(async () => {
              const c = await services.chat.start(instructor.userId);
              navigate("/chat/" + c.id);
            })
          }
        >
          Start a conversation
        </Button>
      </section>
      <SectionTitle title="Learn with me" />
      <div className="course-grid">
        {courses
          ?.filter((c) => c.instructorId === instructorId)
          .map((c) => (
            <CourseCard key={c.id} course={c} instructor={instructor.name} />
          ))}
      </div>
    </>
  );
}
export function Pricing() {
  return (
    <>
      <PageTitle
        eyebrow="INVEST IN YOUR CURIOSITY"
        title="A learning option for every ambition"
        description="Start free. Add a course whenever you’re ready. No recurring subscriptions are sold in this starter."
      />
      <div className="pricing-grid">
        {[
          {
            name: "Explore",
            price: 0,
            desc: "A good place to begin.",
            items: [
              "Free foundation courses",
              "Practice exercises",
              "Progress tracking",
              "Community conversations",
            ],
            to: "/results?price=free",
            cta: "Start for free",
          },
          {
            name: "Build",
            price: 29,
            desc: "Choose the skills that move you forward.",
            items: [
              "One-time course purchases",
              "Every lesson in your course",
              "Assessment & certificate",
              "Lifetime access in this application",
            ],
            to: "/results?price=paid",
            cta: "Find a paid course",
          },
          {
            name: "Your own path",
            price: null,
            desc: "Make a learning plan that fits you.",
            items: [
              "Mix free and paid courses",
              "Learn at your own pace",
              "Set personal reminders",
              "Celebrate your achievements",
            ],
            to: "/explore/paths",
            cta: "Explore learning paths",
          },
        ].map((p, i) => (
          <section
            className={"panel price-card " + (i === 1 ? "featured" : "")}
            key={p.name}
          >
            {i === 1 && <Pill>Grow at your own pace</Pill>}
            <h2 className="space-top">{p.name}</h2>
            <p>{p.desc}</p>
            <div className="price-big">
              {p.price === null ? (
                "Flexible"
              ) : p.price === 0 ? (
                "Free"
              ) : (
                <>
                  <small>from </small>${p.price}
                </>
              )}
              <small>{p.price ? " / course" : ""}</small>
            </div>
            <ul className="checklist">
              {p.items.map((t) => (
                <li key={t}>
                  <Check size={16} />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to={p.to}
              className={"btn wide " + (i === 1 ? "primary" : "secondary")}
            >
              {p.cta}
              <ArrowRight size={15} />
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
export function BackgroundPage() {
  return (
    <>
      <PageTitle
        title="The space for your next idea"
        description="Screen 22 is the shared Proerply brand background used across onboarding and learning."
      />
      <BrandBackground>
        <Pill>LEARN TODAY. BUILD TOMORROW.</Pill>
        <h1 style={{ margin: "30px 0 15px", maxWidth: 500 }}>
          Stay curious.
          <br />
          Make something meaningful.
        </h1>
        <Link className="btn white" to="/explore">
          Find your next course <ArrowRight size={15} />
        </Link>
      </BrandBackground>
    </>
  );
}
