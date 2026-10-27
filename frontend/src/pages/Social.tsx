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
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Edit3,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  Save,
  Send,
  Trash2,
  UserRound,
  Video,
  VideoOff,
} from "lucide-react";
import { useAction, useWorkspace, services, MODE } from "../hooks";
import { request } from "../services/api";
import {
  Avatar,
  Button,
  Empty,
  ErrorState,
  Loading,
  Modal,
  PageTitle,
  Pill,
  SectionTitle,
} from "../components/ui";
import { useUI } from "../state";
export function Reminders() {
  const { data: s } = useWorkspace();
  const act = useAction();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Upcoming");
  const [remove, setRemove] = useState<string | null>(null);
  const list = s?.reminders
    .filter((r) => (tab === "Completed" ? r.completed : !r.completed))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return (
    <>
      <PageTitle
        title="Make a little time for you"
        description="A simple plan to keep your learning moving."
        action={
          <Link className="btn primary" to="/reminders/new">
            <Plus size={16} />
            Add reminder
          </Link>
        }
      />
      <div className="tabs">
        {["Upcoming", "Completed"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {list?.length ? (
        list.map((r) => (
          <article
            className={"reminder-card " + (r.completed ? "completed" : "")}
            key={r.id}
          >
            <span className="date-square">
              {new Date(r.dueAt)
                .toLocaleString("en", { month: "short" })
                .toUpperCase()}
              <strong>{new Date(r.dueAt).getDate()}</strong>
            </span>
            <div>
              <h3>{r.title}</h3>
              <p>
                {new Date(r.dueAt).toLocaleString()} · {r.description}
              </p>
            </div>
            <div className="reminder-actions">
              {!r.completed && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    act(async () => {
                      await services.reminders.save(
                        { ...r, completed: true },
                        r.id,
                      );
                      navigate("/reminders/complete");
                    })
                  }
                >
                  <Check size={15} />
                  Done
                </Button>
              )}
              <Link
                className="icon-btn"
                aria-label={"Edit " + r.title}
                to={"/reminders/" + r.id}
              >
                <Edit3 size={16} />
              </Link>
              <button
                className="icon-btn"
                aria-label={"Delete " + r.title}
                onClick={() => setRemove(r.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))
      ) : (
        <Empty
          title={
            tab === "Completed"
              ? "Small wins will show up here"
              : "A clear calendar, a fresh start"
          }
          description="Set a study reminder and give your curiosity a little space."
          action={
            <Link className="btn primary" to="/reminders/new">
              Create a reminder
            </Link>
          }
        />
      )}
      <div className="inline-note">
        Notifications require browser permission and an open Proerply tab.{" "}
        <Link className="text-link" to="/notifications">
          Manage notification settings
        </Link>
      </div>
      {remove && (
        <Modal title="Delete this reminder?" onClose={() => setRemove(null)}>
          <p>This removes the reminder from your learning plan.</p>
          <div className="button-row space-top">
            <Button
              variant="danger"
              onClick={() =>
                act(async () => {
                  await services.reminders.remove(remove);
                  setRemove(null);
                }, "Reminder deleted.")
              }
            >
              Delete reminder
            </Button>
            <Button variant="secondary" onClick={() => setRemove(null)}>
              Keep it
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function ReminderEditor() {
  const { reminderId = "new" } = useParams();
  const { data: s, isLoading } = useWorkspace();
  if (isLoading) return <Loading />;
  const item = s?.reminders.find((r) => r.id === reminderId);
  if (reminderId !== "new" && !item)
    return (
      <Empty
        title="Reminder not found"
        action={
          <Link className="btn primary" to="/reminders">
            Back to reminders
          </Link>
        }
      />
    );
  return <ReminderForm key={reminderId} item={item} />;
}
function ReminderForm({
  item,
}: {
  item?: NonNullable<
    ReturnType<typeof useWorkspace>["data"]
  >["reminders"][number];
}) {
  const [title, setTitle] = useState(item?.title || ""),
    [due, setDue] = useState(
      localDate(item?.dueAt || new Date(Date.now() + 3600000).toISOString()),
    ),
    [description, setDescription] = useState(item?.description || ""),
    [completed, setCompleted] = useState(item?.completed || false),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate(),
    act = useAction();
  return (
    <section className="panel" style={{ maxWidth: 700, margin: "auto" }}>
      <PageTitle
        title={item ? "A little adjustment" : "Make a plan to grow"}
        description="Give your next learning session a time and a place in your day."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await act(async () => {
            await services.reminders.save(
              {
                title,
                dueAt: new Date(due).toISOString(),
                description,
                completed,
              },
              item?.id,
            );
            navigate("/reminders");
          }, "Your reminder is saved.");
          setBusy(false);
        }}
      >
        <label className="field">
          Reminder title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Finish my next React lesson"
          />
        </label>
        <label className="field">
          Date & time
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            required
          />
          <small>Shown in your device’s local time.</small>
        </label>
        <label className="field">
          A note to yourself
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="A quiet corner. A fresh notebook. Twenty focused minutes."
          />
        </label>
        {item && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
            />
            Completed
          </label>
        )}
        <div className="button-row space-top">
          <Button disabled={busy}>
            <Save size={16} />
            Save reminder
          </Button>
          <Link className="btn secondary" to="/reminders">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
export function ReminderComplete() {
  return (
    <div className="panel celebration">
      <div className="celebration-icon">
        <CheckCircle2 size={48} />
      </div>
      <h1>You showed up for yourself.</h1>
      <p>Your reminder is complete. A little consistency goes a long way.</p>
      <Link className="btn primary" to="/reminders">
        Back to my reminders <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function Chat() {
  const { conversationId } = useParams();
  const { data: s } = useWorkspace();
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => services.chat.list(),
    refetchInterval: MODE === "api" ? 5000 : false,
  });
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false);
  const act = useAction();
  const c = conversations?.find((c) => c.id === conversationId);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
    if (c?.messages.some((m) => !m.read && m.senderId !== s?.user?.id))
      void services.chat.read(c.id).catch(() => {});
  }, [c?.id, c?.messages.length, s?.user?.id]);
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  return (
    <>
      <PageTitle
        title="Good conversations help us grow"
        description={
          MODE === "demo"
            ? "Your demo learning community · Replies are simulated."
            : "Your learning community · Private conversations."
        }
      />
      <div
        className={
          "chat-layout " +
          (conversationId ? "with-conversation" : "without-conversation")
        }
      >
        <aside className="chat-list">
          <SectionTitle
            title="Messages"
            action={
              <Link to="/explore/instructors">
                <Plus size={16} />
              </Link>
            }
          />
          {conversations?.map((c) => (
            <Link
              className={
                "conversation-link " + (c.id === conversationId ? "active" : "")
              }
              to={"/chat/" + c.id}
              key={c.id}
            >
              <Avatar name={c.name} />
              <div>
                <strong>{c.name}</strong>
                <p>
                  {c.messages.at(-1)?.text.slice(0, 54) ||
                    "Start a conversation"}
                  …
                </p>
              </div>
            </Link>
          ))}
          {!conversations?.length && (
            <p style={{ fontSize: 12, padding: 12 }}>
              No conversations yet. Visit an instructor profile to say hello.
            </p>
          )}
        </aside>
        <section className="chat-conversation">
          {c ? (
            <>
              <header className="chat-header">
                <div>
                  <Link
                    className="icon-btn"
                    aria-label="All conversations"
                    to="/chat"
                  >
                    <ArrowLeft size={17} />
                  </Link>
                  <Avatar name={c.name} />
                  <div>
                    <strong>{c.name}</strong>
                    <p>{MODE === "demo" ? "Demo conversation" : c.subtitle}</p>
                  </div>
                </div>
                <Link className="btn secondary" to={"/video-chat/" + c.id}>
                  <Video size={17} />
                  <span>Video</span>
                </Link>
              </header>
              <div className="messages">
                {c.messages.map((m) => (
                  <div
                    className={
                      "message " + (m.senderId === s?.user?.id ? "mine" : "")
                    }
                    key={m.id}
                  >
                    <p>{m.text}</p>
                    <small>
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {m.read ? "Read" : "Sent"}
                    </small>
                  </div>
                ))}
                {!c.messages.length && (
                  <Empty
                    title="Start with a hello"
                    description="Ask a question or share what you’re working on."
                  />
                )}
                <div ref={end} />
              </div>
              <form
                className="compose"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim() || busy) return;
                  setBusy(true);
                  await act(async () => {
                    await services.chat.send(c.id, text);
                    setText("");
                  });
                  setBusy(false);
                }}
              >
                <input
                  className="input"
                  aria-label="Message"
                  placeholder="Share a thought or ask a question…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  required
                />
                <Button disabled={!text.trim() || busy}>
                  <Send size={17} />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </>
          ) : (
            <Empty
              title={
                conversationId
                  ? "Conversation not found"
                  : "A good question opens a new door"
              }
              description="Choose a conversation, or visit an instructor to start one."
              action={
                <Link className="btn primary" to="/explore/instructors">
                  Meet the instructors
                </Link>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
export function Profile({ variant = "self" }: { variant?: string }) {
  const { userId = "teacher" } = useParams();
  const { data: s } = useWorkspace();
  const { data: publicData, error } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => services.profile.public(userId),
    enabled: variant === "friend",
  });
  const act = useAction(),
    navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  if (variant === "friend") {
    if (error) return <ErrorState error={error} />;
    if (!publicData) return <Loading />;
    return (
      <>
        <section className="panel profile-header">
          <Avatar
            name={publicData.user.name || "Learner"}
            src={publicData.user.avatar}
            size="xl"
          />
          <div>
            <Pill>LEARNING COMMUNITY</Pill>
            <h1 className="space-top">{publicData.user.name}</h1>
            <p>
              {publicData.user.publicProfile
                ? publicData.user.bio
                : "This learner keeps their activity private."}
            </p>
          </div>
          <Button
            onClick={() =>
              act(async () => {
                const c = await services.chat.start(userId);
                navigate("/chat/" + c.id);
              })
            }
          >
            <MessageSquare size={16} />
            Message
          </Button>
        </section>
        {publicData.user.publicProfile && (
          <section className="panel">
            <h2>Shared achievements</h2>
            {publicData.certificates.length ? (
              publicData.certificates.map((c) => (
                <p key={c.id} className="space-top">
                  {c.courseTitle} · {new Date(c.issuedAt).toLocaleDateString()}
                </p>
              ))
            ) : (
              <p className="space-top">No public certificates yet.</p>
            )}
          </section>
        )}
      </>
    );
  }
  if (!s?.user)
    return (
      <Empty
        title="Make this space yours"
        action={
          <Link className="btn primary" to="/login">
            Sign in
          </Link>
        }
      />
    );
  return (
    <>
      <PageTitle
        title="Your space to grow"
        description="Make your learning experience feel like you."
      />
      <section className="panel profile-header">
        <Avatar name={s.user.name} src={s.user.avatar} size="lg" />
        <div>
          <h1>{s.user.name}</h1>
          <p>
            {s.user.email} · {s.user.role}
          </p>
          <Pill tone="green">
            {s.enrollments.length} courses · {s.achievements.length} badges
          </Pill>
        </div>
        <Link className="btn secondary" to="/achievements">
          My achievements
        </Link>
      </section>
      <div className="two-col">
        <ProfileForm key={s.user.id} user={s.user} />
        <div>
          <section className="panel">
            <SectionTitle title="Make it your own" />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={s.user.publicProfile}
                onChange={(e) =>
                  act(
                    () =>
                      services.profile.update({
                        publicProfile: e.target.checked,
                      }),
                    "Privacy preference saved.",
                  )
                }
              />
              Share my bio and earned certificates on my public profile
            </label>
            <p style={{ fontSize: 11, margin: "10px 0 20px" }}>
              Your email, conversations, reminders and private progress are
              never shown on a public profile.
            </p>
            <Link className="text-link" to={"/users/" + s.user.id}>
              Preview public profile <ArrowRight size={14} />
            </Link>
            <hr />
            <Link className="btn secondary" to="/notifications">
              <Bell size={16} />
              Notification settings
            </Link>
            <Link className="text-link space-top" to="/onboarding/1">
              Replay the welcome tour
            </Link>
          </section>
          {MODE === "demo" && (
            <section className="panel">
              <Pill>DEMO WORKSPACE</Pill>
              <h3 className="space-top">
                A fresh start, whenever you need it.
              </h3>
              <p style={{ fontSize: 12, margin: "10px 0 18px" }}>
                All demo data lives in this browser. Resetting removes local
                profile edits, progress, enrollments, and messages.
              </p>
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Reset demo data
              </Button>
            </section>
          )}
          <section className="panel">
            <h3>Ready for a break?</h3>
            <Button
              variant="secondary"
              className="space-top"
              onClick={() =>
                act(async () => {
                  await services.auth.logout();
                  navigate("/login");
                })
              }
            >
              Sign out
            </Button>
          </section>
        </div>
      </div>
      {confirm && (
        <Modal
          title="Reset your demo workspace?"
          onClose={() => setConfirm(false)}
        >
          <p>
            Your browser-local learning activity will be replaced with the
            original demo data.
          </p>
          <div className="button-row space-top">
            <Button
              variant="danger"
              onClick={() =>
                act(async () => {
                  await services.resetDemo();
                  setConfirm(false);
                  navigate("/home");
                }, "Demo workspace reset.")
              }
            >
              Reset demo
            </Button>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep my progress
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ProfileForm({
  user,
}: {
  user: NonNullable<ReturnType<typeof useWorkspace>["data"]>["user"] & {};
}) {
  const [name, setName] = useState(user.name),
    [bio, setBio] = useState(user.bio),
    [avatar, setAvatar] = useState(user.avatar),
    [busy, setBusy] = useState(false);
  const act = useAction();
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await act(
          () => services.profile.update({ name, bio, avatar }),
          "Profile updated.",
        );
        setBusy(false);
      }}
    >
      <SectionTitle title="The basics" />
      <label className="field">
        Display name
        <input
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field">
        A little about you
        <textarea
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </label>
      <label className="field">
        Profile picture
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 300000
            ) {
              useUI
                .getState()
                .notice("Choose a PNG, JPG or WebP image smaller than 300 KB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setAvatar(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
        <small>
          PNG, JPG or WebP · Maximum 300 KB · Stored with your profile
        </small>
      </label>
      {avatar && (
        <div className="button-row" style={{ marginBottom: 20 }}>
          <Avatar name={name} src={avatar} />
          <Button type="button" variant="ghost" onClick={() => setAvatar("")}>
            Remove photo
          </Button>
        </div>
      )}
      <Button disabled={busy} type="submit">
        <Save size={16} />
        Save profile
      </Button>
    </form>
  );
}
export function VideoChat() {
  const { conversationId = "mentor" } = useParams();
  const local = useRef<HTMLVideoElement>(null),
    remote = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    peer = useRef<RTCPeerConnection | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    alive = useRef(true);
  const [active, setActive] = useState(false),
    [muted, setMuted] = useState(false),
    [camera, setCamera] = useState(true),
    [status, setStatus] = useState("Ready when you are"),
    [busy, setBusy] = useState(false);
  const act = useAction();
  function release() {
    stream.current?.getTracks().forEach((t) => t.stop());
    peer.current?.close();
    peer.current = null;
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setActive(false);
    setStatus("Call ended. Camera and microphone released.");
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      peer.current?.close();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  async function getMedia() {
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "Camera access requires HTTPS or localhost and browser support.",
      );
    const media = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (!alive.current) {
      media.getTracks().forEach((t) => t.stop());
      throw Error("Call screen was closed.");
    }
    stream.current = media;
    if (local.current) local.current.srcObject = media;
    setActive(true);
    setMuted(false);
    setCamera(true);
    return media;
  }
  async function gather(pc: RTCPeerConnection) {
    if (pc.iceGatheringState === "complete") return;
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", handler);
        resolve();
      }, 5000);
      const handler = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(t);
          pc.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", handler);
    });
  }
  async function start(join = false) {
    setBusy(true);
    await act(async () => {
      try {
        const media = await getMedia();
        if (MODE === "demo") {
          setStatus("DEMO · Local camera preview only. No remote participant.");
          return;
        }
        const config = await request<RTCConfiguration>("/calls/config");
        const pc = new RTCPeerConnection(config);
        peer.current = pc;
        media.getTracks().forEach((t) => pc.addTrack(t, media));
        pc.ontrack = (e) => {
          if (remote.current) remote.current.srcObject = e.streams[0];
        };
        pc.onconnectionstatechange = () =>
          setStatus("Connection: " + pc.connectionState);
        if (join) {
          const signal = await request<{
            offer: RTCSessionDescriptionInit | null;
          }>("/calls/" + conversationId);
          if (!signal.offer)
            throw Error(
              "No active invitation. Ask your partner to start a call first.",
            );
          await pc.setRemoteDescription(signal.offer);
          await pc.setLocalDescription(await pc.createAnswer());
          await gather(pc);
          await request("/calls/" + conversationId, "POST", {
            answer: pc.localDescription,
          });
          setStatus("Connecting to your learning partner…");
        } else {
          await pc.setLocalDescription(await pc.createOffer());
          await gather(pc);
          await request("/calls/" + conversationId, "POST", {
            offer: pc.localDescription,
          });
          setStatus(
            "Waiting for your partner to join this conversation’s video screen.",
          );
        }
        timer.current = setInterval(() => {
          void request<{
            answer: RTCSessionDescriptionInit | null;
            ended: boolean;
          }>("/calls/" + conversationId)
            .then(async (signal) => {
              if (signal.ended) {
                release();
                return;
              }
              if (signal.answer && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(signal.answer);
                setStatus("Connecting…");
              }
            })
            .catch((e) => {
              setStatus(e.message);
              if (timer.current) clearInterval(timer.current);
            });
        }, 2000);
      } catch (e) {
        release();
        throw e;
      }
    });
    setBusy(false);
  }
  return (
    <>
      <PageTitle
        title={
          MODE === "demo"
            ? "A face-to-face moment · Demo"
            : "Your learning conversation"
        }
        description={
          MODE === "demo"
            ? "Try your camera and microphone. This is a local preview, not a live call."
            : "Two participants can connect through authenticated signaling. STUN/TURN must be configured for reliable network traversal."
        }
      />
      <div className="video-stage" style={{ minHeight: 440 }}>
        <video
          ref={remote}
          autoPlay
          playsInline
          style={{ display: MODE === "api" && active ? "block" : "none" }}
        />
        <video
          ref={local}
          autoPlay
          playsInline
          muted
          className={MODE === "api" && active ? "self-video" : ""}
          style={{ display: active ? "block" : "none" }}
        />
        {!active && (
          <div className="video-placeholder">
            <Avatar name="Your learning space" size="xl" />
            <h2 className="space-top">Ready to connect?</h2>
            <p>Camera and microphone start only when you choose to join.</p>
          </div>
        )}
        <span className="call-state">{status}</span>
      </div>
      <div className="call-controls">
        {!active ? (
          <>
            <Button disabled={busy} onClick={() => start(false)}>
              <Video size={18} />
              {MODE === "demo" ? "Start local preview" : "Start call"}
            </Button>
            {MODE === "api" && (
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => start(true)}
              >
                Join existing call
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              onClick={() => {
                stream.current
                  ?.getAudioTracks()
                  .forEach((t) => (t.enabled = muted));
                setMuted(!muted);
              }}
            >
              {muted ? <MicOff size={19} /> : <Mic size={19} />}
            </Button>
            <Button
              variant="secondary"
              aria-label={camera ? "Turn camera off" : "Turn camera on"}
              onClick={() => {
                stream.current
                  ?.getVideoTracks()
                  .forEach((t) => (t.enabled = !camera));
                setCamera(!camera);
              }}
            >
              {camera ? <Video size={19} /> : <VideoOff size={19} />}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                release();
                if (MODE === "api")
                  void request("/calls/" + conversationId, "POST", {
                    ended: true,
                  }).catch(() => {});
              }}
            >
              <PhoneOff size={18} />
              End
            </Button>
          </>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <Link className="text-link" to={"/chat/" + conversationId}>
          <ArrowLeft size={15} />
          Back to conversation
        </Link>
      </div>
    </>
  );
}
