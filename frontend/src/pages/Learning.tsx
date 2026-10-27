import { useEffect, useRef, useState } from "react";
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
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Film,
  GraduationCap,
  Link2,
  Lock,
  Play,
  RotateCcw,
  Share2,
  Star,
  Trophy,
} from "lucide-react";
import { services, MODE, useAction, useCatalog, useWorkspace } from "../hooks";
import { useUI } from "../state";
import {
  Button,
  CourseCard,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  Pill,
  ProgressBar,
  SectionTitle,
} from "../components/ui";
export function MyLearning() {
  const { data: s } = useWorkspace(),
    { data: catalog } = useCatalog();
  const [tab, setTab] = useState("All");
  const courses = catalog
    ?.filter((c) => s?.enrollments.some((e) => e.courseId === c.id))
    .filter(
      (c) =>
        tab === "All" ||
        (tab === "Completed"
          ? s?.certificates.some((x) => x.courseId === c.id)
          : !s?.certificates.some((x) => x.courseId === c.id)),
    );
  return (
    <>
      <PageTitle
        title="Your learning journey"
        description="Keep going. Your future self will thank you."
      />
      <div className="tabs">
        {["All", "In progress", "Completed"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {!catalog ? (
        <Loading />
      ) : courses?.length ? (
        <div className="course-grid">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              progress={
                ((s?.progress.filter((p) => p.courseId === c.id && p.completed)
                  .length || 0) /
                  c.lessons.length) *
                100
              }
            />
          ))}
        </div>
      ) : (
        <Empty
          title="Make space for a new skill"
          description="Find a course you love and start your next chapter."
          action={
            <Link className="btn primary" to="/explore">
              Explore courses
            </Link>
          }
        />
      )}
    </>
  );
}
export function LessonPage({ variant = "lesson" }: { variant?: string }) {
  const { courseId = "", lessonId } = useParams();
  const {
    data: c,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => services.courses.getCourse(courseId),
  });
  const { data: s } = useWorkspace();
  const navigate = useNavigate(),
    act = useAction();
  const video = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);
  const completed =
    s?.progress.filter((p) => p.courseId === courseId && p.completed) || [];
  const lid =
    lessonId ||
    c?.lessons.find((l) => !completed.some((p) => p.lessonId === l.id))?.id ||
    c?.lessons[0]?.id;
  const lesson = c?.lessons.find((l) => l.id === lid);
  const index = c?.lessons.findIndex((l) => l.id === lid) || 0;
  const enrolled = s?.enrollments.some((e) => e.courseId === courseId);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    lastSaved.current = 0;
  }, [lid]);
  if (isLoading || !s) return <Loading />;
  if (error || !c) return <ErrorState error={error} retry={refetch} />;
  if (!enrolled)
    return (
      <Empty
        title="Your next chapter is ready"
        description="Enroll in this course to unlock the lessons and assessment."
        action={
          <Link className="btn primary" to={"/courses/" + courseId}>
            View course & enroll
          </Link>
        }
      />
    );
  if (!lesson)
    return (
      <Empty
        title="Lesson not found"
        action={
          <Link
            to={"/learning/" + courseId + "/playlist"}
            className="btn primary"
          >
            Open curriculum
          </Link>
        }
      />
    );
  async function complete() {
    setBusy(true);
    await act(async () => {
      await services.progress.update(lesson!.id, { completed: true });
      navigate("/lesson-complete?course=" + courseId + "&lesson=" + lesson!.id);
    }, "Lesson completed. Nice work!");
    setBusy(false);
  }
  const playlist = (
    <section className="panel">
      <SectionTitle
        title="Course curriculum"
        description={`${completed.length} of ${c.lessons.length} lessons completed`}
      />
      <ProgressBar value={(completed.length / c.lessons.length) * 100} />
      {Object.entries(
        c.lessons.reduce<Record<string, typeof c.lessons>>((groups, l) => {
          (groups[l.section] ??= []).push(l);
          return groups;
        }, {}),
      ).map(([section, lessons]) => (
        <details open key={section}>
          <summary>{section}</summary>
          {lessons?.map((l) => (
            <div className="lesson-row" key={l.id}>
              <Link
                to={`/learning/${c.id}/lesson/${l.id}`}
                style={{ color: lid === l.id ? "var(--primary)" : undefined }}
              >
                <span className="lesson-number">
                  {completed.some((p) => p.lessonId === l.id) ? (
                    <Check size={14} />
                  ) : (
                    <Play size={12} />
                  )}
                </span>
                {l.title}
              </Link>
              <span>{l.minutes}m</span>
            </div>
          ))}
        </details>
      ))}
      <Link className="btn secondary wide space-top" to={"/quiz/" + c.id}>
        <GraduationCap size={17} />
        Take the assessment
      </Link>
    </section>
  );
  return (
    <>
      <Link
        to="/my-learning"
        className="text-link"
        style={{ marginBottom: 22 }}
      >
        <ArrowLeft size={14} />
        My learning
      </Link>
      <PageTitle
        title={variant === "playlist" ? c.title : lesson.title}
        description={
          variant === "playlist"
            ? "Every lesson is another step forward."
            : `${c.title} · Lesson ${index + 1} of ${c.lessons.length}`
        }
        action={
          <Pill tone="green">
            {Math.round((completed.length / c.lessons.length) * 100)}% complete
          </Pill>
        }
      />
      {variant === "playlist" ? (
        <div className="detail-grid">
          <div>{playlist}</div>
          <aside className="panel">
            <h2>Ready when you are.</h2>
            <p className="space-top">
              Continue your learning journey at your own pace.
            </p>
            <Link
              className="btn primary wide space-top"
              to={`/learning/${c.id}/lesson/${lesson.id}`}
            >
              <Play size={16} />
              Resume lesson
            </Link>
          </aside>
        </div>
      ) : (
        <div className="detail-grid">
          <div>
            <div className="video-stage">
              {lesson.videoUrl ? (
                <video
                  key={lesson.id}
                  ref={video}
                  controls
                  preload="metadata"
                  src={lesson.videoUrl}
                  onLoadedMetadata={() => {
                    if (video.current)
                      video.current.currentTime =
                        s.progress.find((p) => p.lessonId === lesson.id)
                          ?.position || 0;
                  }}
                  onTimeUpdate={() => {
                    const p = video.current?.currentTime || 0;
                    if (Math.abs(p - lastSaved.current) >= 10) {
                      lastSaved.current = p;
                      void services.progress
                        .update(lesson.id, { position: p })
                        .catch((e) => useUI.getState().notice(e.message));
                    }
                  }}
                  onPause={() => {
                    const p = video.current?.currentTime;
                    if (p !== undefined)
                      void services.progress
                        .update(lesson.id, { position: p })
                        .catch((e) => useUI.getState().notice(e.message));
                  }}
                  onError={() =>
                    useUI
                      .getState()
                      .notice(
                        "The configured video could not be loaded. You can still read the lesson below.",
                      )
                  }
                >
                  <track kind="captions" />
                  Your browser cannot play this video.
                </video>
              ) : (
                <div className="video-placeholder">
                  <Film size={40} />
                  <Pill>GUIDED READING LESSON</Pill>
                  <h2 style={{ marginTop: 15 }}>{lesson.title}</h2>
                  <p>
                    No video is configured for this original sample lesson. Read
                    the lesson and try the exercise below. Instructors can add a
                    licensed video URL in the studio.
                  </p>
                  <a className="btn white" href="#lesson-content">
                    <BookOpen size={15} />
                    Read this lesson
                  </a>
                </div>
              )}
            </div>
            <div className="video-toolbar">
              <span className="checkbox-label">
                <Clock size={15} />
                {lesson.minutes} min · {c.language}
              </span>
              <Link
                className="text-link"
                to={`/learning/${c.id}/lesson/${lesson.id}/notes`}
              >
                Reading & exercise <ArrowRight size={13} />
              </Link>
            </div>
            <section
              id="lesson-content"
              className="panel lesson-copy space-top"
            >
              <Pill>
                {variant === "notes" ? "LESSON NOTES" : lesson.section}
              </Pill>
              <h2 className="space-top">{lesson.title}</h2>
              <p>{lesson.content}</p>
              <div className="exercise">
                <h3>Make it your own</h3>
                <p>{lesson.exercise}</p>
              </div>
              <div className="button-row">
                {index > 0 && (
                  <Link
                    className="btn secondary"
                    to={`/learning/${c.id}/lesson/${c.lessons[index - 1].id}`}
                  >
                    <ArrowLeft size={15} />
                    Previous lesson
                  </Link>
                )}
                <Button disabled={busy} onClick={complete}>
                  {completed.some((p) => p.lessonId === lesson.id)
                    ? "Completed · Continue"
                    : "Mark complete & continue"}
                  <Check size={16} />
                </Button>
              </div>
            </section>
          </div>
          <aside>{playlist}</aside>
        </div>
      )}
    </>
  );
}
export function LessonComplete() {
  const [p] = useSearchParams();
  const cid = p.get("course") || "react",
    lid = p.get("lesson") || "react-1";
  const { data: s } = useWorkspace(),
    { data: catalog } = useCatalog();
  const c = catalog?.find((c) => c.id === cid);
  const done = s?.progress.some((p) => p.lessonId === lid && p.completed);
  const i = c?.lessons.findIndex((l) => l.id === lid) ?? -1;
  const next = c?.lessons[i + 1];
  return (
    <div className="panel celebration">
      <div className="celebration-icon">
        {done ? <CheckCircle2 size={48} /> : <BookOpen size={48} />}
      </div>
      <Pill tone="green">ONE STEP AT A TIME</Pill>
      <h1 className="space-top">
        {done
          ? "Look at you, making progress."
          : "Your next lesson is waiting."}
      </h1>
      <p>
        {done
          ? "Take a moment to let that sink in. Then keep your momentum going."
          : "Open a lesson and mark it complete when you have finished the exercise."}
      </p>
      <div className="button-row">
        <Link
          className="btn primary"
          to={next ? `/learning/${cid}/lesson/${next.id}` : `/quiz/${cid}`}
        >
          {next ? "Next lesson" : "Take the assessment"}
          <ArrowRight size={16} />
        </Link>
        <Link className="btn secondary" to="/my-learning">
          Back to my learning
        </Link>
      </div>
    </div>
  );
}
export function QuizPage({ variant = "quiz" }: { variant?: string }) {
  const { quizId = "react" } = useParams();
  const {
    data: q,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => services.quizzes.get(quizId),
  });
  const { data: s } = useWorkspace();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate(),
    act = useAction();
  const latest = s?.attempts.filter((a) => a.quizId === quizId).at(-1);
  if (isLoading) return <Loading />;
  if (error || !q) return <ErrorState error={error} retry={refetch} />;
  if (variant === "results") {
    if (!latest)
      return (
        <Empty
          title="Start with the assessment"
          description="Submit your answers to see your score and review."
          action={
            <Link to={"/quiz/" + quizId} className="btn primary">
              Take assessment
            </Link>
          }
        />
      );
    return (
      <>
        <div className="panel celebration">
          <div className="celebration-icon">
            {latest.passed ? <Trophy size={48} /> : <RotateCcw size={48} />}
          </div>
          <Pill tone={latest.passed ? "green" : "orange"}>
            {latest.passed ? "ASSESSMENT PASSED" : "ANOTHER CHANCE TO GROW"}
          </Pill>
          <h1 className="space-top">
            {latest.score}% ·{" "}
            {latest.passed ? "Nicely done!" : "Keep learning."}
          </h1>
          <p>
            {latest.passed
              ? "You’ve earned the Curious Mind badge. Finish all lessons to unlock your certificate."
              : `You need ${q.passScore}% to pass. Review the explanations below and try again when you’re ready.`}
          </p>
          <div className="button-row">
            <Link className="btn primary" to={"/quiz/" + quizId}>
              Try again
            </Link>
            <Link
              className="btn secondary"
              to={
                latest.passed
                  ? "/achievements"
                  : "/learning/" + quizId + "/playlist"
              }
            >
              {latest.passed ? "View achievements" : "Review lessons"}
            </Link>
          </div>
        </div>
        <SectionTitle title="Your answer review" />
        {q.questions.map((question, i) => {
          const feedback = latest.feedback.find((f) => f.id === question.id);
          return (
            <section className="panel" key={question.id}>
              <h3>
                {i + 1}. {question.text}
              </h3>
              <p style={{ fontSize: 12, marginTop: 10 }}>
                Your answer: {question.options[latest.answers[question.id]]}
              </p>
              <div
                className={
                  "feedback " +
                  (latest.answers[question.id] === feedback?.correct
                    ? "correct"
                    : "")
                }
              >
                <strong>
                  Correct answer: {question.options[feedback?.correct ?? 0]}
                </strong>
                <p>{feedback?.explanation}</p>
              </div>
            </section>
          );
        })}
      </>
    );
  }
  if (!s?.enrollments.some((e) => e.courseId === quizId))
    return (
      <Empty
        title="Enroll to take this assessment"
        action={
          <Link className="btn primary" to={"/courses/" + quizId}>
            View course
          </Link>
        }
      />
    );
  return (
    <>
      <PageTitle
        eyebrow="A MOMENT TO REFLECT"
        title="Put your learning into practice"
        description={`${q.questions.length} questions · ${q.passScore}% to pass · Unlimited retries`}
        action={
          <Pill>
            {Object.keys(answers).length} / {q.questions.length} answered
          </Pill>
        }
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await act(async () => {
            await services.quizzes.submit(quizId, answers);
            navigate("/quiz/" + quizId + "/results");
          });
          setBusy(false);
        }}
      >
        {q.questions.map((question, i) => (
          <fieldset className="quiz-question" key={question.id}>
            <legend>
              {i + 1}. {question.text}
            </legend>
            <div className="quiz-options">
              {question.options.map((o, j) => (
                <label className="quiz-option" key={j}>
                  <input
                    type="radio"
                    required
                    name={question.id}
                    value={j}
                    checked={answers[question.id] === j}
                    onChange={() =>
                      setAnswers({ ...answers, [question.id]: j })
                    }
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <Button
          disabled={busy || Object.keys(answers).length < q.questions.length}
          type="submit"
        >
          {busy ? "Checking your answers…" : "Submit assessment"}
          <ArrowRight size={16} />
        </Button>
      </form>
    </>
  );
}
export function Achievements() {
  const { badgeId } = useParams();
  const { data: s } = useWorkspace();
  const badges = badgeId
    ? s?.achievements.filter((b) => b.id === badgeId)
    : s?.achievements;
  return (
    <>
      <PageTitle
        eyebrow="CELEBRATE THE SMALL WINS"
        title="Your hard work, recognized"
        description="A little proof of how far you’ve come."
      />
      {badges?.length ? (
        <div className="badge-grid">
          {badges.map((b) => (
            <article className="panel badge-card" key={b.id}>
              <Award size={58} />
              <Pill tone="orange">EARNED BADGE</Pill>
              <h3 className="space-top">{b.title}</h3>
              <p>{b.description}</p>
              <small className="muted">
                {b.awardedAt && new Date(b.awardedAt).toLocaleDateString()}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Your first badge is just a lesson away"
          description="Complete a lesson to earn First Step, or pass an assessment to earn Curious Mind."
          action={
            <Link className="btn primary" to="/my-learning">
              Continue learning
            </Link>
          }
        />
      )}
      <SectionTitle
        title="Your certificates"
        description="Complete all lessons and pass the course assessment to earn a certificate."
      />
      <div className="stack">
        {s?.certificates.map((c) => (
          <Link className="panel" key={c.id} to={"/certificates/" + c.id}>
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <Pill tone="green">COURSE COMPLETE</Pill>
                <h3 style={{ marginTop: 10 }}>{c.courseTitle}</h3>
                <p style={{ fontSize: 11 }}>
                  Issued {new Date(c.issuedAt).toLocaleDateString()}
                </p>
              </div>
              <ArrowRight size={20} />
            </div>
          </Link>
        ))}
      </div>
      {!s?.certificates.length && (
        <p style={{ fontSize: 12 }}>
          No certificates yet. Keep working through your current course.
        </p>
      )}
    </>
  );
}
export function CertificatePage() {
  const { certificateId = "" } = useParams();
  const { data: s } = useWorkspace();
  const c = s?.certificates.find((c) => c.id === certificateId);
  if (!c)
    return (
      <Empty
        title="This certificate isn’t available yet"
        description="Complete every lesson and pass the assessment to unlock your certificate."
        action={
          <Link className="btn primary" to="/my-learning">
            Continue learning
          </Link>
        }
      />
    );
  return (
    <>
      <PageTitle
        title="A chapter worth celebrating"
        action={
          <Button onClick={() => window.print()}>
            <Download size={16} />
            Print / save PDF
          </Button>
        }
      />
      <article className="certificate">
        <div className="brand">
          <span className="brand-mark">p</span>proerply.
        </div>
        <div className="certificate-label">CERTIFICATE OF COMPLETION</div>
        <p>This is to recognize the dedication and curiosity of</p>
        <h1>{c.name}</h1>
        <p>who has successfully completed all lessons and the assessment for</p>
        <h2>{c.courseTitle}</h2>
        <Award size={55} color="#bca36c" style={{ margin: "25px auto 0" }} />
        <div className="certificate-signature">
          <span>
            Proerply Learning Studio
            <br />
            Learn today. Build tomorrow.
          </span>
          <span>
            {new Date(c.issuedAt).toLocaleDateString()}
            <br />
            {c.id}
          </span>
        </div>
        {MODE === "demo" && (
          <p style={{ marginTop: 16, fontSize: 9 }}>
            DEMO CERTIFICATE · Sample learning experience · Not an accredited
            qualification
          </p>
        )}
      </article>
      <p
        className="no-print"
        style={{ fontSize: 12, textAlign: "center", marginTop: 25 }}
      >
        Choose “Save as PDF” in your browser’s print dialog to download your
        certificate.
      </p>
    </>
  );
}
export function ShareCourse() {
  const { courseId = "react" } = useParams();
  const { data: catalog } = useCatalog();
  const c = catalog?.find((c) => c.id === courseId);
  const act = useAction();
  const url = location.origin + "/courses/" + courseId;
  async function copy() {
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
    else {
      const el = document.getElementById("share-link") as HTMLInputElement;
      el.select();
      if (!document.execCommand("copy"))
        throw Error("Select and copy the course link manually.");
    }
  }
  return (
    <div className="panel celebration">
      <div className="celebration-icon">
        <Share2 size={45} />
      </div>
      <h1>Good ideas are better shared.</h1>
      <p>Invite someone to explore {c?.title || "this course"} with you.</p>
      <label className="field" style={{ textAlign: "left" }}>
        Course link
        <input
          className="input"
          id="share-link"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <div className="button-row">
        <Button onClick={() => act(copy, "Course link copied.")}>
          <Copy size={16} />
          Copy link
        </Button>
        {!!navigator.share && (
          <Button
            variant="secondary"
            onClick={() =>
              act(() =>
                navigator.share({
                  title: c?.title || "Learn with Proerply",
                  url,
                }),
              )
            }
          >
            <Share2 size={16} />
            Share course
          </Button>
        )}
      </div>
    </div>
  );
}
