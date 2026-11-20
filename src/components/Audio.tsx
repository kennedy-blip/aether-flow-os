import { useEffect, useRef } from "react";
import { AudioLines, Play, Pause } from "lucide-react";
import { audio } from "../services/audioEngine";
const names = [
  "Theta Binaural",
  "Cybernetic Rain",
  "Nebula Drone",
  "Vinyl Crackle",
];
const colors = ["#aa80ff", "#62d4ee", "#7f80ff", "#ed9acb"];
export function Audio({
  levels,
  setLevels,
  playing,
  toggle,
  full = false,
  pro,
  frequency,
  setFrequency,
}: {
  levels: number[];
  setLevels: (n: number[]) => void;
  playing: boolean;
  toggle: () => void;
  full?: boolean;
  pro: boolean;
  frequency: number;
  setFrequency: (n: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const el = canvas.current,
      ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const draw = () => {
      const { width: w, height: h } = el;
      ctx.clearRect(0, 0, w, h);
      const data = new Uint8Array(audio.analyser?.frequencyBinCount ?? 128);
      if (playing) audio.analyser?.getByteFrequencyData(data);
      for (let i = 0; i < 70; i++) {
        const envelope = 0.2 + 0.8 * Math.pow(Math.sin(i * 0.128 + 1), 2);
        const amp = playing
          ? Math.max(0.04, (data[Math.floor(i * 2.5)] ?? 0) / 255)
          : envelope * (0.26 + 0.48 * Math.abs(Math.sin(i * 1.23)));
        const b = Math.max(2, amp * h * 0.88);
        ctx.fillStyle = i % 4 === 0 ? "#a589ff" : "#6952bd";
        ctx.globalAlpha = playing ? 0.85 : 0.42;
        ctx.fillRect((i * w) / 70, (h - b) / 2, Math.max(1, w / 70 - 2), b);
      }
      if (playing) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const change = (i: number, v: number) =>
    setLevels(levels.map((n, j) => (j === i ? v : n)));
  return (
    <section className="panel audio">
      <div className="widget-title">
        <AudioLines size={18} />
        <h3>Audio Lab</h3>
        <button
          className="icon sound-play"
          aria-label={playing ? "Pause audio" : "Play audio"}
          onClick={toggle}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
      <canvas
        ref={canvas}
        width="420"
        height="84"
        aria-label="Audio frequency spectrum"
      />
      <div className="mixers">
        {levels.map((n, i) => (
          <label key={i} style={{ "--tone": colors[i] } as React.CSSProperties}>
            <span>
              <i />
              {names[i]}
            </span>
            <input
              aria-label={names[i]}
              type="range"
              min="0"
              max="100"
              value={n}
              onChange={(e) => change(i, +e.target.value)}
            />
            <small>{n}%</small>
          </label>
        ))}
      </div>
      {full && (
        <>
          <div className="mix-pad" aria-label="Spatial mixing pad">
            {levels.map((n, i) => (
              <button
                key={i}
                aria-label={`Drag ${names[i]} vertically to mix`}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    change(
                      i,
                      Math.max(
                        0,
                        Math.min(100, n + (e.key === "ArrowUp" ? 5 : -5)),
                      ),
                    );
                  }
                }}
                onPointerDown={(e) =>
                  e.currentTarget.setPointerCapture(e.pointerId)
                }
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  const box =
                    e.currentTarget.parentElement!.getBoundingClientRect();
                  change(
                    i,
                    Math.round(
                      Math.max(
                        0,
                        Math.min(
                          100,
                          (1 - (e.clientY - box.top) / box.height) * 100,
                        ),
                      ),
                    ),
                  );
                }}
                style={{
                  left: `${14 + i * 24}%`,
                  bottom: `${8 + n * 0.78}%`,
                  background: colors[i],
                  color: colors[i],
                }}
              />
            ))}
          </div>
          {pro && (
            <label className="row">
              Theta carrier · {frequency} Hz{" "}
              <input
                type="range"
                min="80"
                max="360"
                value={frequency}
                onChange={(e) => setFrequency(+e.target.value)}
              />
            </label>
          )}
        </>
      )}
    </section>
  );
}
