import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Circle,
  CircleCheck,
  CircleDot,
  FileText,
  Pin,
} from "lucide-react";
import type { Note } from "../types";
export const spring = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.8,
} as const;
export const enter = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: spring },
};
export function NoteCard({
  note,
  onClick,
}: {
  note: Note;
  onClick: () => void;
}) {
  const Icon =
    note.status === "Completed"
      ? CircleCheck
      : note.status === "In Flow"
        ? CircleDot
        : Circle;
  return (
    <motion.button
      layoutId={"note-" + note.id}
      variants={enter}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.965 }}
      transition={spring}
      className="panel note"
      onClick={onClick}
    >
      <div className="row spread">
        <span className={"tile " + note.tag.toLowerCase()}>
          <FileText size={18} />
        </span>
        <span className="note-icons">
          {note.pinned && <Pin size={14} />}
          <ArrowUpRight size={17} />
        </span>
      </div>
      <h3>{note.title}</h3>
      <p>{note.body}</p>
      <div className="note-foot">
        <span className={"tag " + note.tag.toLowerCase()}>{note.tag}</span>
        <span className={"state " + note.status.replace(" ", "-")}>
          <Icon size={13} />
          {note.status}
        </span>
      </div>
    </motion.button>
  );
}
export function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}
export function jsonDownload(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          data,
          (_, value) =>
            value instanceof ArrayBuffer
              ? Array.from(new Uint8Array(value))
              : value,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
