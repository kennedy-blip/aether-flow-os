import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, sync } from "../services/db";
import { jsonDownload } from "./Kit";
export function Diagnostics({
  pro,
  admin,
  online,
  privileges,
}: {
  pro: boolean;
  admin: boolean;
  online: boolean;
  privileges: () => void;
}) {
  const queue = useLiveQuery(() => db.queue.toArray(), []) ?? [];
  const [progress, setProgress] = useState(0),
    [fps, setFps] = useState(0),
    [raw, setRaw] = useState(""),
    [message, setMessage] = useState(""),
    [running, setRunning] = useState(false);
  useEffect(() => {
    if (!admin) return;
    let raf = 0,
      start = performance.now(),
      frames = 0;
    const sample = (t: number) => {
      frames++;
      if (t - start >= 1000) {
        setFps(Math.round((frames * 1000) / (t - start)));
        start = t;
        frames = 0;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [admin]);
  const inspect = async () => ({
    notes: await db.notes.toArray(),
    queue: await db.queue.toArray(),
    sessions: await db.sessions.toArray(),
    vault: await db.vault.toArray(),
  });
  return (
    <section className="panel stack diagnostics">
      <h2>System Telemetry</h2>
      <p>
        {online
          ? "ONLINE · LOCAL SYNC SIMULATION"
          : "OFFLINE · LOCAL DEXIE ENGINE"}
      </p>
      <p>
        Notes remain on this device. Queue replay simulates cloud
        acknowledgements; no records are uploaded.
      </p>
      {message && <p role="status">{message}</p>}
      {pro ? (
        <>
          <div className="row spread">
            <span>
              {queue.filter((r) => r.state === "pending").length} pending
              mutations
            </span>
            <button
              className="primary"
              disabled={!online || running}
              onClick={async () => {
                setRunning(true);
                try {
                  await sync(setProgress);
                } catch {
                  setMessage("Replay failed. Pending items were retained.");
                } finally {
                  setRunning(false);
                }
              }}
            >
              Force Sync Now
            </button>
          </div>
          <progress value={progress} max={1} />
          <div className="queue">
            {queue
              .slice()
              .reverse()
              .map((r) => (
                <div className="row spread" key={r.id}>
                  <span>
                    {r.kind} · {r.payload?.title ?? r.noteId}
                  </span>
                  <small>{r.state}</small>
                  {r.state === "conflict" && (
                    <button
                      onClick={() =>
                        void db.queue.update(r.id!, { state: "pending" })
                      }
                    >
                      Retry local version
                    </button>
                  )}
                </div>
              ))}
          </div>
        </>
      ) : (
        <button onClick={privileges}>Unlock queue controls</button>
      )}
      {admin && (
        <>
          <h3>{fps} FPS · Storage Inspector</h3>
          <div className="row wrap">
            <button
              onClick={async () =>
                setRaw(
                  JSON.stringify(
                    await inspect(),
                    (_, v) =>
                      v instanceof ArrayBuffer
                        ? Array.from(new Uint8Array(v))
                        : v,
                    2,
                  ),
                )
              }
            >
              View IndexedDB
            </button>
            <button
              onClick={async () =>
                jsonDownload(await inspect(), "aetherflow-storage.json")
              }
            >
              Export JSON
            </button>
            <button
              onClick={async () => {
                await db.queue.add({
                  noteId: "conflict-demo",
                  kind: "Saved",
                  at: Date.now(),
                  state: "conflict",
                });
                setMessage(
                  "Simulated a version conflict; no note was modified.",
                );
              }}
            >
              Simulate conflict
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch("/releases/manifest.json");
                  if (!response.ok) throw Error();
                  setRaw(JSON.stringify(await response.json(), null, 2));
                } catch {
                  setMessage("No Android release manifest has been published.");
                }
              }}
            >
              Inspect APK manifest
            </button>
          </div>
          {raw && <pre>{raw}</pre>}
        </>
      )}
    </section>
  );
}
