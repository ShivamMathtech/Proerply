import {
  Component,
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Play,
  Search,
  Star,
  X,
} from "lucide-react";
import type { Course } from "../types";
import { useUI } from "../state";
export function Button({
  children,
  className = "",
  variant = "primary",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`btn ${variant} ${className}`} {...p}>
      {children}
    </button>
  );
}
export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string;
  size?: string;
}) {
  return src ? (
    <img className={`avatar ${size}`} src={src} alt={name} />
  ) : (
    <span className={`avatar ${size}`} aria-label={name}>
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Pill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label="Course completion"
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageTitle({
  title,
  eyebrow,
  description,
  action,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "Your next chapter starts with a small step.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      <div className="skeleton tall" />
      <div className="skeleton" />
      <div className="skeleton" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="empty error" role="alert">
      <h3>Let’s try that again</h3>
      <p>{error instanceof Error ? error.message : "Something went wrong."}</p>
      {retry && <Button onClick={retry}>Retry</Button>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose}>
      <div className="section-title">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Toast() {
  const { toast, dismiss } = useUI();
  useEffect(() => {
    if (toast) {
      const t = setTimeout(dismiss, 6000);
      return () => clearTimeout(t);
    }
  }, [toast, dismiss]);
  return toast ? (
    <div className="toast" role="status">
      <span>{toast}</span>
      <button aria-label="Dismiss notification" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  ) : null;
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h1>Let’s get you back on track</h1>
        <p>The page encountered an unexpected error.</p>
        <Button onClick={() => location.reload()}>Reload application</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function CourseArt({
  course,
  large = false,
}: {
  course: Pick<Course, "color" | "art">;
  large?: boolean;
}) {
  return (
    <div
      className={`course-art ${course.color} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <div className="art-orbit one" />
      <div className="art-orbit two" />
      {course.art === "design" || course.art === "brand" ? (
        <div className="art-design">
          <div className="mini-browser">
            <i />
            <i />
            <i />
            <div className="mini-layout">
              <div />
              <section>
                <b />
                <b />
                <b />
              </section>
            </div>
          </div>
          <div className="floating-chip">
            {course.art === "brand" ? "Aa" : "✦"}
          </div>
          <div className="cursor-arrow">↗</div>
        </div>
      ) : course.art === "data" ? (
        <div className="art-chart">
          <div className="chart-label">MAKE IT MEANINGFUL</div>
          <div className="bars">
            {[30, 48, 38, 70, 59, 89].map((v, i) => (
              <span key={i} style={{ height: v + "%" }} />
            ))}
          </div>
          <div className="chart-line" />
        </div>
      ) : course.art === "photo" ? (
        <div className="camera-art">
          <div className="camera-top" />
          <div className="camera-body">
            <span />
            <div className="camera-lens">
              <div />
            </div>
          </div>
          <div className="photo-caption">A NEW PERSPECTIVE</div>
        </div>
      ) : (
        <div className="art-code">
          <div className="code-top">
            <span />
            <span />
            <span />
          </div>
          <div className="code-symbol">
            {course.art === "python" ? "Py" : "{ }"}
          </div>
          <div className="code-lines">
            <i />
            <i />
            <i />
          </div>
          <span className="code-tag">
            {course.art === "python"
              ? "HELLO, POSSIBILITIES"
              : "BUILD SOMETHING GREAT"}
          </span>
        </div>
      )}
    </div>
  );
}
export function CourseCard({
  course,
  instructor,
  progress,
}: {
  course: Course;
  instructor?: string;
  progress?: number;
}) {
  return (
    <article className="course-card">
      <Link
        to={
          progress === undefined
            ? "/courses/" + course.id
            : "/learning/" + course.id + "/playlist"
        }
        className="art-link"
        aria-label={course.title}
      >
        <CourseArt course={course} />
        {progress === undefined && (
          <span className="art-badge">{course.level}</span>
        )}
        {progress !== undefined && (
          <span className="play-badge">
            <Play size={20} fill="currentColor" />
          </span>
        )}
      </Link>
      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.category}</span>
          <span>
            <Star size={13} fill="currentColor" />
            {course.rating}
          </span>
        </div>
        <Link to={"/courses/" + course.id}>
          <h3>{course.title}</h3>
        </Link>
        <p className="instructor-name">{instructor || "Proerply Studio"}</p>
        {progress === undefined ? (
          <div className="course-footer">
            <span>
              <Clock size={14} />
              {course.duration} min · {course.lessons.length} lessons
            </span>
            <strong>{course.price ? `$${course.price}` : "Free"}</strong>
          </div>
        ) : (
          <div className="course-progress">
            <div>
              <span>{Math.round(progress)}% complete</span>
              <Link to={"/learning/" + course.id + "/playlist"}>
                Continue <ArrowRight size={14} />
              </Link>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>
    </article>
  );
}
export function BrandBackground({ children }: { children?: ReactNode }) {
  return (
    <div className="brand-background">
      <div className="brand-ring r1" />
      <div className="brand-ring r2" />
      <div className="brand-ring r3" />
      {children}
    </div>
  );
}
export function Money({ value }: { value: number }) {
  return (
    <>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)}
    </>
  );
}
