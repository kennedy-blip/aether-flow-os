import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Activity,
  AudioLines,
  ArrowDownToLine,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Layers3,
  LayoutGrid,
  LockKeyhole,
  Monitor,
  Palette,
  Plus,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  X,
  Zap,
  Pin,
  Trash2,
  Wifi,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Device } from "@capacitor/device";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useLiveQuery } from "dexie-react-hooks";
import { db, mutate, sync } from "./services/db";
import { audio } from "./services/audioEngine";
import { usePreference } from "./context/preferences";
import { Audio } from "./components/Audio";
import { Focus, useFocus } from "./components/Focus";
import { Vault } from "./components/Vault";
import { Diagnostics } from "./components/Diagnostics";
import { Release, fetchRelease, saveRelease } from "./components/Release";
import { NoteCard, enter, spring } from "./components/Kit";
import { statuses, tags, type Note, type Role } from "./types";
import "./style.css";
const nav = [
  ["Workspace", LayoutGrid],
  ["Audio Lab", AudioLines],
  ["Focus Engine", Clock3],
  ["Vault", LockKeyhole],
  ["Diagnostics", Activity],
] as const;
type Page = (typeof nav)[number][0];
type Modal = "privileges" | "theme" | "release" | "note" | null;
const native = Capacitor.isNativePlatform();
const themes = ["Obsidian Liquid", "Solaris Frost", "Cyber Prism"] as const;
function App() {
  const [page, setPage] = useState<Page>("Workspace"),
    [modal, setModal] = useState<Modal>(
      new URLSearchParams(location.search).has("android") ? "release" : null,
    ),
    [preview, setPreview] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All cards"),
    [category, setCategory] = useState("All tags"),
    [draft, setDraft] = useState<Note>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [role, setRole] = usePreference<Role>("role", "Explorer"),
    [theme, setTheme] = usePreference<(typeof themes)[number]>(
      "theme",
      "Obsidian Liquid",
    ),
    [eco, setEco] = usePreference("eco", false),
    [blur, setBlur] = usePreference("blur", 18),
    [refraction, setRefraction] = usePreference("refraction", 30),
    [haptics, setHaptics] = usePreference("haptics", false),
    [levels, setLevels] = usePreference("levels", [65, 42, 28, 15]),
    [frequency, setFrequency] = usePreference("frequency", 180);
  const [motionOn, setMotion] = useState(false),
    [persist, setPersist] = useState(false),
    [quota, setQuota] = useState<StorageEstimate>(),
    [playing, setPlaying] = useState(false),
    [release, setRelease] =
      useState<Awaited<ReturnType<typeof fetchRelease>>>(null),
    [loading, setLoading] = useState(true),
    [legacy, setLegacy] = useState(false),
    [biometric, setBiometric] = useState(false);
  const pro = role !== "Explorer",
    admin = role === "Root System Admin";
  const notes =
    useLiveQuery(() => db.notes.orderBy("updated").reverse().toArray(), []) ??
    [];
  const pending =
    useLiveQuery(() => db.queue.where("state").equals("pending").count(), []) ??
    0;
  const shell = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const haptic = useCallback(() => {
    if (!haptics) return;
    if (native && Capacitor.isPluginAvailable("Haptics"))
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    else navigator.vibrate?.(15);
  }, [haptics]);
  const focus = useFocus(haptic);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (online && pro && pending) {
      const id = setTimeout(() => void sync().catch(() => {}), 800);
      return () => clearTimeout(id);
    }
  }, [online, pro, pending]);
  useEffect(() => {
    void fetchRelease().then((m) => {
      setRelease(m);
      setLoading(false);
    });
    if (native) {
      void Device.getInfo()
        .then((info) =>
          setLegacy(
            info.androidSDKVersion !== undefined && info.androidSDKVersion < 31,
          ),
        )
        .catch(() => {});
      void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (native)
      void StatusBar.setStyle({
        style: theme === "Solaris Frost" ? Style.Light : Style.Dark,
      }).catch(() => {});
  }, [theme]);
  useEffect(() => {
    audio.volumes(levels);
    audio.frequency(frequency);
  }, [levels, frequency]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal && dialog.current?.open) dialog.current.close();
    if (modal === "privileges") {
      void navigator.storage
        ?.estimate()
        .then(setQuota)
        .catch(() => {});
      void navigator.storage
        ?.persisted()
        .then(setPersist)
        .catch(() => {});
    }
  }, [modal]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal(null);
        setPage("Workspace");
        requestAnimationFrame(() => search.current?.focus());
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!motionOn) return;
    const update = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      shell.current?.style.setProperty(
        "--rx",
        `${Math.max(-3, Math.min(3, e.beta / 18))}deg`,
      );
      shell.current?.style.setProperty(
        "--ry",
        `${Math.max(-3, Math.min(3, e.gamma / 12))}deg`,
      );
      shell.current?.style.setProperty("--mx", `${50 + e.gamma / 2}%`);
    };
    addEventListener("deviceorientation", update);
    return () => {
      removeEventListener("deviceorientation", update);
      shell.current?.style.removeProperty("--rx");
      shell.current?.style.removeProperty("--ry");
    };
  }, [motionOn]);
  function open(m: Modal) {
    setError("");
    setModal(m);
  }
  function edit(note?: Note) {
    setDraft(
      note ?? {
        id: crypto.randomUUID(),
        title: "",
        body: "",
        tag: "Architecture",
        status: "Backlog",
        pinned: false,
        updated: Date.now(),
      },
    );
    open("note");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft?.title.trim() || busy) return;
    setBusy(true);
    try {
      await mutate(
        { ...draft, title: draft.title.trim(), updated: Date.now() },
        "Saved",
        pro,
      );
      open(null);
    } catch {
      setError("Could not save to local storage.");
    } finally {
      setBusy(false);
    }
  }
  const visible = notes
    .filter(
      (n) =>
        (filter === "All cards" ||
          (filter === "Pinned" ? n.pinned : n.status === filter)) &&
        (category === "All tags" || n.tag === category) &&
        `${n.title} ${n.body} ${n.tag}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const getAndroid = async () => {
    open("release");
    const m = await fetchRelease();
    setRelease(m);
    setLoading(false);
    saveRelease(m);
  };
  const audioProps = {
    levels,
    setLevels,
    playing,
    pro,
    frequency,
    setFrequency,
    toggle: () =>
      void audio
        .toggle(levels, frequency)
        .then(setPlaying)
        .catch(() =>
          setError("Audio could not start. Check your browser audio settings."),
        ),
  };
  return (
    <MotionConfig transition={spring} reducedMotion="user">
      <div
        className={`environment ${theme === themes[1] ? "solar" : theme === themes[2] ? "cyber" : ""} ${eco || legacy ? "eco" : ""} ${preview ? "preview" : ""} ${native ? "native" : ""}`}
        style={
          {
            "--blur": `${pro ? blur : 18}px`,
            "--shine": `${pro ? refraction : 30}%`,
          } as CSSProperties
        }
        onClickCapture={(e) => {
          if ((e.target as Element).closest("button")) haptic();
        }}
      >
        <svg className="filters" aria-hidden="true">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".8"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <filter id="goo">
            <feGaussianBlur stdDeviation="3" in="SourceGraphic" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 17 -7"
            />
            <feBlend in="SourceGraphic" />
          </filter>
        </svg>
        <div className="mesh" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="grain" aria-hidden="true" />
        <div
          ref={shell}
          className={motionOn ? "tilt tilted" : "tilt"}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const box = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty(
              "--mx",
              `${((e.clientX - box.left) / box.width) * 100}%`,
            );
            e.currentTarget.style.setProperty(
              "--my",
              `${((e.clientY - box.top) / box.height) * 100}%`,
            );
          }}
        >
          <motion.div
            className="shell"
            animate={
              modal
                ? {
                    scale: 0.94,
                    borderRadius: 28,
                    filter: "blur(8px) brightness(.7)",
                  }
                : { scale: 1, borderRadius: 0, filter: "none" }
            }
            inert={!!modal}
          >
            <aside className="sidebar">
              <div className="brand">
                <div className="brand-icon">
                  <Layers3 size={21} />
                </div>
                <div>
                  <strong>
                    AetherFlow<span> OS</span>
                  </strong>
                  <small>SPATIAL OPERATING SYSTEM</small>
                </div>
              </div>
              <div className="nav-label">WORKSPACE</div>
              <nav aria-label="Modules">
                {nav.map(([name, Icon]) => (
                  <button
                    key={name}
                    aria-current={page === name ? "page" : undefined}
                    className={page === name ? "selected" : ""}
                    onClick={() => {
                      setPage(name);
                      setError("");
                    }}
                  >
                    {page === name && (
                      <motion.span
                        className="active-pill"
                        layoutId="active-tab"
                      />
                    )}
                    <Icon size={19} />
                    <span>{name}</span>
                    {name === "Vault" && !pro && (
                      <LockKeyhole className="nav-lock" size={12} />
                    )}
                  </button>
                ))}
              </nav>
              <div className="sidebar-bottom">
                <button className="install" onClick={() => void getAndroid()}>
                  <span className="tile">
                    <Smartphone size={18} />
                  </span>
                  <span>
                    <strong>Android app</strong>
                    <small>Get the native experience</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
                <div className="system">
                  <i />
                  <span>Local engine active</span>
                  <small>v1.0.0</small>
                </div>
              </div>
            </aside>
            <div className="main">
              <header>
                <div className="crumb">
                  <span>Console</span>
                  <ChevronRight size={13} />
                  <strong>{page}</strong>
                </div>
                <div className="header-tools">
                  <button
                    className="icon view"
                    aria-label={
                      preview ? "Desktop spatial view" : "Mobile APK preview"
                    }
                    title={
                      preview ? "Desktop spatial view" : "Mobile APK preview"
                    }
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? <Monitor size={17} /> : <Smartphone size={17} />}
                  </button>
                  <button
                    className="icon"
                    aria-label="Themes"
                    title="Themes"
                    onClick={() => open("theme")}
                  >
                    <Palette size={17} />
                  </button>
                  <button
                    className="priv"
                    aria-label="Privileges"
                    onClick={() => open("privileges")}
                  >
                    <Shield size={16} />
                    <span>Privileges</span>
                    <ChevronDown size={13} />
                  </button>
                  <button
                    className="apk"
                    aria-label="Get Android .APK"
                    onClick={() => void getAndroid()}
                  >
                    <ArrowDownToLine size={16} />
                    <span>Get Android .APK</span>
                  </button>
                </div>
              </header>
              <main>
                {error && !modal && <p role="alert">{error}</p>}
                {page === "Workspace" ? (
                  <>
                    <section className="hero">
                      <div className="hero-inner">
                        <div className="eyebrow">
                          <Sparkles size={13} /> YOUR PERSONAL COMMAND CENTER
                        </div>
                        <h1>
                          Make space
                          <br /> for <em>deep work.</em>
                        </h1>
                        <p>
                          Capture ideas, tune your environment, and find your
                          flow.
                          <br className="desktop-break" /> All in a workspace
                          that stays yours.
                        </p>
                        <button className="primary" onClick={() => edit()}>
                          <Plus size={17} /> New spatial note{" "}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <span className="hero-index">01 / AETHER SPACE</span>
                    </section>
                    <div className="dashboard">
                      <section className="workspace">
                        <div className="row spread section-title">
                          <div>
                            <div className="kicker">01 / CAPTURE</div>
                            <h2>Spatial Workspace</h2>
                            <p>Organize ideas and move work into flow.</p>
                          </div>
                          <button
                            className="icon add"
                            aria-label="New note"
                            onClick={() => edit()}
                          >
                            <Plus size={19} />
                          </button>
                        </div>
                        <div className="toolbox">
                          <label className="search">
                            <Search size={16} />
                            <input
                              ref={search}
                              placeholder="Search notes…"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                            />
                            <kbd>
                              <Command size={11} /> K
                            </kbd>
                          </label>
                          <select
                            aria-label="Filter by tag"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            <option>All tags</option>
                            {tags.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="tabs" aria-label="Filter by status">
                          {["All cards", "Pinned", ...statuses].map((t) => (
                            <button
                              key={t}
                              className={filter === t ? "current" : ""}
                              aria-pressed={filter === t}
                              onClick={() => setFilter(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <motion.div
                          className="notes"
                          initial="hidden"
                          animate="show"
                          variants={{
                            show: { transition: { staggerChildren: 0.045 } },
                          }}
                        >
                          {visible.map((n) => (
                            <NoteCard
                              key={n.id}
                              note={n}
                              onClick={() => edit(n)}
                            />
                          ))}
                          {visible.length === 0 && (
                            <div className="panel empty">
                              No notes match this view.
                            </div>
                          )}
                          <button className="new-card" onClick={() => edit()}>
                            <span>
                              <Plus size={20} />
                            </span>
                            <strong>New spatial note</strong>
                            <small>Capture an idea or task</small>
                          </button>
                        </motion.div>
                      </section>
                      <aside className="widgets">
                        <div className="row spread section-title">
                          <div>
                            <div className="kicker">02 / REGULATE</div>
                            <h2>Flow Controls</h2>
                            <p>Set the pace for your next session.</p>
                          </div>
                          <span className="widget-zap">
                            <Zap size={16} />
                          </span>
                        </div>
                        <Focus focus={focus} />
                        <Audio {...audioProps} />
                      </aside>
                    </div>
                  </>
                ) : (
                  <motion.div
                    key={page}
                    variants={enter}
                    initial="hidden"
                    animate="show"
                    className="module"
                  >
                    <div className="kicker">AETHERFLOW / MODULE</div>
                    <h1>{page}</h1>
                    {page === "Focus Engine" && (
                      <Focus focus={focus} notes={notes} full />
                    )}
                    {page === "Audio Lab" && <Audio {...audioProps} full />}
                    {page === "Vault" && (
                      <Vault pro={pro} privileges={() => open("privileges")} />
                    )}
                    {page === "Diagnostics" && (
                      <Diagnostics
                        pro={pro}
                        admin={admin}
                        online={online}
                        privileges={() => open("privileges")}
                      />
                    )}
                  </motion.div>
                )}
                <footer>
                  <span>
                    <Wifi size={14} />{" "}
                    {online
                      ? "ONLINE · LOCAL ENGINE"
                      : "OFFLINE · LOCAL DEXIE ENGINE"}
                  </span>
                  <span>
                    {pending} queued <i /> AETHERFLOW OS
                  </span>
                </footer>
              </main>
            </div>
          </motion.div>
        </div>
        {preview && (
          <button className="exit-preview" onClick={() => setPreview(false)}>
            <Monitor size={16} /> Exit mobile preview
          </button>
        )}
        <dialog
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            open(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) open(null);
          }}
        >
          <AnimatePresence>
            {modal && (
              <motion.div
                key={modal}
                layoutId={
                  modal === "note" && draft ? "note-" + draft.id : undefined
                }
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                className="panel modal"
              >
                <button
                  className="icon close"
                  aria-label="Close dialog"
                  onClick={() => open(null)}
                >
                  <X size={18} />
                </button>
                {modal === "release" && (
                  <Release release={release} loading={loading} />
                )}
                {modal === "theme" && (
                  <div className="stack">
                    <h2>Appearance</h2>
                    <p>Choose a workspace theme and rendering mode.</p>
                    {themes.map((t) => (
                      <button
                        className={theme === t ? "choice chosen" : "choice"}
                        key={t}
                        onClick={() => setTheme(t)}
                      >
                        {t}
                      </button>
                    ))}
                    <label className="row spread">
                      Eco Glass{" "}
                      <input
                        type="checkbox"
                        checked={eco || legacy}
                        disabled={legacy}
                        onChange={(e) => setEco(e.target.checked)}
                      />
                    </label>
                    {pro && (
                      <>
                        <label>
                          Glass blur · {blur}px{" "}
                          <input
                            type="range"
                            min="0"
                            max="35"
                            value={blur}
                            onChange={(e) => setBlur(+e.target.value)}
                          />
                        </label>
                        <label>
                          Refraction · {refraction}%{" "}
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={refraction}
                            onChange={(e) => setRefraction(+e.target.value)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
                {modal === "privileges" && (
                  <div className="stack">
                    <h2>Privileges</h2>
                    <p>
                      Roles unlock local features. They are not account
                      permissions.
                    </p>
                    {(
                      [
                        "Explorer",
                        "Architect Pro",
                        "Root System Admin",
                      ] as Role[]
                    ).map((r, i) => (
                      <button
                        key={r}
                        className={r === role ? "choice chosen" : "choice"}
                        onClick={() => setRole(r)}
                      >
                        <strong>{r}</strong>
                        <small>
                          {
                            [
                              "Notes, timer, and base audio",
                              "Encrypted vault, audio sculpting, and queue controls",
                              "All features plus storage and telemetry tools",
                            ][i]
                          }
                        </small>
                      </button>
                    ))}
                    <h3>Device capabilities</h3>
                    <label className="row spread">
                      Motion lighting{" "}
                      <small>{motionOn ? "GRANTED" : "RESTRICTED"}</small>
                      <input
                        type="checkbox"
                        checked={motionOn}
                        onChange={async (e) => {
                          if (!e.target.checked) {
                            setMotion(false);
                            return;
                          }
                          try {
                            const orientation =
                              window.DeviceOrientationEvent as
                                | (typeof DeviceOrientationEvent & {
                                    requestPermission?: () => Promise<string>;
                                  })
                                | undefined;
                            if (
                              !orientation ||
                              (orientation.requestPermission &&
                                (await orientation.requestPermission()) !==
                                  "granted")
                            )
                              throw Error();
                            setMotion(true);
                          } catch {
                            setError(
                              "Motion sensors unavailable or permission denied.",
                            );
                          }
                        }}
                      />
                    </label>
                    <label className="row spread">
                      Haptics{" "}
                      <small>
                        {haptics && (native || "vibrate" in navigator)
                          ? "GRANTED"
                          : "RESTRICTED"}
                      </small>
                      <input
                        type="checkbox"
                        checked={haptics}
                        onChange={(e) => setHaptics(e.target.checked)}
                      />
                    </label>
                    <button
                      onClick={async () => {
                        try {
                          const granted = await navigator.storage?.persist();
                          setPersist(!!granted);
                          setQuota(await navigator.storage?.estimate());
                          if (!granted)
                            setError(
                              "This device did not grant persistent storage.",
                            );
                        } catch {
                          setError("Persistent storage is unavailable.");
                        }
                      }}
                    >
                      Persistent storage · {persist ? "GRANTED" : "RESTRICTED"}
                    </button>
                    {quota && (
                      <small>
                        {((quota.usage ?? 0) / 1e6).toFixed(2)} MB used /{" "}
                        {((quota.quota ?? 0) / 1e6).toFixed(2)} MB quota
                      </small>
                    )}
                    <button onClick={() => setBiometric(!biometric)}>
                      Biometric preview · {biometric ? "SIMULATED" : "OFF"}
                    </button>
                    {biometric && (
                      <small>
                        Preview only. Biometrics do not unlock the vault; enter
                        your PIN and passphrase.
                      </small>
                    )}
                  </div>
                )}
                {modal === "note" && draft && (
                  <form className="stack" onSubmit={save}>
                    <h2>
                      {notes.some((n) => n.id === draft.id)
                        ? "Edit spatial note"
                        : "New spatial note"}
                    </h2>
                    <label>
                      Title
                      <input
                        autoFocus
                        required
                        maxLength={120}
                        value={draft.title}
                        onChange={(e) =>
                          setDraft({ ...draft, title: e.target.value })
                        }
                        placeholder="Name your idea"
                      />
                    </label>
                    <label>
                      Note
                      <textarea
                        value={draft.body}
                        onChange={(e) =>
                          setDraft({ ...draft, body: e.target.value })
                        }
                        placeholder="What’s on your mind?"
                      />
                    </label>
                    <div className="row wrap">
                      <label>
                        Tag
                        <select
                          value={draft.tag}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              tag: e.target.value as Note["tag"],
                            })
                          }
                        >
                          {tags.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              status: e.target.value as Note["status"],
                            })
                          }
                        >
                          {statuses.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="row wrap">
                      <button
                        type="button"
                        aria-pressed={draft.pinned}
                        onClick={() =>
                          setDraft({ ...draft, pinned: !draft.pinned })
                        }
                      >
                        <Pin size={15} />
                        {draft.pinned ? "Unpin" : "Pin"}
                      </button>
                      {notes.some((n) => n.id === draft.id) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await mutate(draft, "Deleted", pro);
                              open(null);
                            } catch {
                              setError("Could not delete the note.");
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      )}
                      <button
                        type="submit"
                        className="primary"
                        disabled={busy || !draft.title.trim()}
                      >
                        Save note
                      </button>
                    </div>
                  </form>
                )}
                {error && <p role="alert">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </dialog>
      </div>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && !native && "serviceWorker" in navigator)
  void navigator.serviceWorker.register("/sw.js").catch(console.warn);
