import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock3, Play, Pause, RotateCcw, Flame } from "lucide-react";
import { db } from "../services/db";
import { audio } from "../services/audioEngine";
import type { Note } from "../types";
export function useFocus(haptic: () => void) {
  const [minutes, setMinutes] = useState(25),
    [seconds, setSeconds] = useState(1500),
    [end, setEnd] = useState(0),
    [task, setTask] = useState("");
  useEffect(() => {
    if (!end) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSeconds(left);
      if (!left) {
        clearInterval(interval);
        setEnd(0);
        void db.sessions.add({
          id: crypto.randomUUID(),
          at: Date.now(),
          minutes,
          task,
        });
        audio.chime();
        haptic();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [end, minutes, task, haptic]);
  return {
    minutes,
    seconds,
    end,
    task,
    setTask,
    change: (n: number) => {
      setEnd(0);
      setMinutes(n);
      setSeconds(n * 60);
    },
    toggle: () => {
      if (end) {
        setSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
        setEnd(0);
      } else {
        void audio.prepare().catch(() => {});
        if (!seconds) setSeconds(minutes * 60);
        setEnd(Date.now() + (seconds || minutes * 60) * 1000);
      }
    },
    reset: () => {
      setEnd(0);
      setSeconds(minutes * 60);
    },
  };
}
export function Focus({
  focus,
  full = false,
  notes = [],
}: {
  focus: ReturnType<typeof useFocus>;
  full?: boolean;
  notes?: Note[];
}) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const dates = new Set(sessions.map((x) => new Date(x.at).toDateString()));
  const day = new Date();
  if (!dates.has(day.toDateString())) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (dates.has(day.toDateString())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  const { seconds, minutes, end } = focus;
  return (
    <section className={"panel focus " + (full ? "full-focus" : "")}>
      <div className="widget-title">
        <Clock3 size={17} />
        <h3>Focus Engine</h3>
        <span>SESSION</span>
      </div>
      <div className="timer">
        <svg viewBox="0 0 160 160">
          <defs>
            <linearGradient id="timerGradient">
              <stop stopColor="#7060ef" />
              <stop offset="1" stopColor="#c49bff" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="72" className="track" />
          <circle
            cx="80"
            cy="80"
            r="72"
            pathLength="100"
            strokeDasharray={`${(seconds / (minutes * 60)) * 100} 100`}
            className="progress"
          />
        </svg>
        <div>
          <strong>
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </strong>
          <small>{end ? "IN SESSION" : "DEEP WORK"}</small>
        </div>
      </div>
      <div className="timer-actions">
        <button className="primary" onClick={focus.toggle}>
          {end ? <Pause size={15} /> : <Play size={15} />}{" "}
          {end ? "Pause" : "Start Focus"}
        </button>
        <button className="icon" aria-label="Reset timer" onClick={focus.reset}>
          <RotateCcw size={16} />
        </button>
      </div>
      {full && (
        <div className="stack focus-settings">
          <label>
            Interval (minutes)
            <input
              type="number"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) =>
                focus.change(Math.max(1, Math.min(180, Number(e.target.value))))
              }
            />
          </label>
          <label>
            Linked task
            <select
              disabled={!!end}
              value={focus.task}
              onChange={(e) => focus.setTask(e.target.value)}
            >
              <option value="">No linked task</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </label>
          <span className="row">
            <Flame size={16} /> {streak} day streak · {sessions.length}{" "}
            completed sessions
          </span>
        </div>
      )}
    </section>
  );
}
