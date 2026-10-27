import type { ComponentType, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "./components/Layout";
import {
  ErrorBoundary,
  PageTitle,
  Empty,
  Loading,
  ErrorState,
} from "./components/ui";
import { useWorkspace, MODE } from "./hooks";
import registry from "./route-registry.json";
import * as Discovery from "./pages/Discovery";
import * as Auth from "./pages/Auth";
import * as Learning from "./pages/Learning";
import * as Payments from "./pages/Payments";
import * as Social from "./pages/Social";
import * as AdminPages from "./pages/Admin";
const { AuthShell: _AuthShell, ...authPages } = Auth;
export const components: Record<string, ComponentType<{ variant?: string }>> = {
  ...Discovery,
  ...authPages,
  ...Learning,
  ...Payments,
  ...Social,
  ...AdminPages,
};
function Guard({ children, access }: { children: ReactNode; access: string }) {
  const { data: s, isLoading, error, refetch } = useWorkspace();
  if (access === "public") return children;
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!s?.user) return <Navigate to="/login" replace />;
  if (access === "staff" && s.user.role === "learner")
    return (
      <Empty
        title="This space is for instructors and administrators"
        action={
          <Link className="btn primary" to="/home">
            Back to learning
          </Link>
        }
      />
    );
  return children;
}
export function Directory() {
  return (
    <>
      <PageTitle
        title="The complete Proerply experience"
        description="All 41 numbered screens, with descriptive routes and connected states."
      />
      <div className="directory-grid">
        {registry.map((r) => (
          <Link
            className="directory-item"
            key={r.number}
            to={r.example || r.path}
          >
            <span>{String(r.number).padStart(2, "0")}</span>
            {r.title}
            <ArrowRight size={14} />
          </Link>
        ))}
      </div>
      <p className="space-top">
        Completion, assessment review, and certificate screens show an
        eligibility state until their learning requirements are met.
      </p>
    </>
  );
}
function About() {
  return (
    <article className="panel about-copy">
      <PageTitle title="A thoughtful place to keep growing" />
      <p>
        Proerply brings courses, guided lessons, assessments, and a learning
        community into one responsive workspace.
      </p>
      <h2>
        {MODE === "demo" ? "About this demo" : "About your connected workspace"}
      </h2>
      <p>
        {MODE === "demo"
          ? "Your demo profile and activity are stored in this browser. Authentication, payments, and conversation replies are simulated. No real messages or payments are sent. Reset the demo from your profile whenever you want a fresh start."
          : "This workspace uses a configured FastAPI service. Accounts, learning progress and private conversations are stored in its database. Payments require configured hosted checkout and verified webhooks."}
      </p>
      <h2>Learning content</h2>
      <p>
        The included courses contain original sample reading lessons and
        practice questions. Video is optional; instructors can configure a
        licensed HTTPS video URL. Certificates recognize completion within this
        application and are not accredited qualifications.
      </p>
      <h2>Your privacy</h2>
      <p>
        Your public profile shows your name, and only shares your bio and
        certificates when you opt in. Email addresses, reminders, private
        messages and progress are not shared publicly.
      </p>
      <h2>Reminders and calls</h2>
      <p>
        Browser reminders run while the application is open and permission is
        granted. Demo calls use only a local camera preview. Connected calls use
        WebRTC with server signaling; reliable connectivity requires configured
        STUN/TURN.
      </p>
      <Link className="btn primary space-top" to="/explore">
        Find your next course
      </Link>
    </article>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {registry
            .filter((r) => r.layout === "auth")
            .map((r) => {
              const C = components[r.component];
              return (
                <Route
                  path={r.path}
                  element={<C variant={r.variant} />}
                  key={r.number}
                />
              );
            })}
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            {registry
              .filter((r) => r.layout === "app")
              .map((r) => {
                const C = components[r.component];
                return (
                  <Route
                    path={r.path}
                    element={
                      <Guard access={r.access}>
                        <C variant={r.variant} />
                      </Guard>
                    }
                    key={r.number}
                  />
                );
              })}
            <Route
              path="/my-learning"
              element={
                <Guard access="user">
                  <Learning.MyLearning />
                </Guard>
              }
            />
            <Route
              path="/achievements"
              element={
                <Guard access="user">
                  <Learning.Achievements />
                </Guard>
              }
            />
            <Route
              path="/admin"
              element={
                <Guard access="staff">
                  <AdminPages.Admin />
                </Guard>
              }
            />
            <Route
              path="/admin/courses/:courseId"
              element={
                <Guard access="staff">
                  <AdminPages.CourseEditor />
                </Guard>
              }
            />
            <Route path="/screens" element={<Directory />} />
            <Route path="/about" element={<About />} />
            <Route
              path="*"
              element={
                <Empty
                  title="A little off the learning path"
                  description="We couldn’t find that page. Your next chapter is still waiting."
                  action={
                    <Link className="btn primary" to="/home">
                      Back to my workspace
                    </Link>
                  }
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
