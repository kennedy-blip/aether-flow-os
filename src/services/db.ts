import Dexie, { type Table } from "dexie";
import type { Note, Mutation, VaultEntry } from "../types";
const seed: Note[] = [
  {
    id: "blueprint",
    title: "Design system blueprint",
    body: "Define the glass surface tokens, spacing scale, and motion primitives for the next workspace iteration.",
    tag: "Architecture",
    status: "In Flow",
    pinned: true,
    updated: Date.now(),
  },
  {
    id: "ritual",
    title: "Deep work rituals",
    body: "A collection of small habits for easing into focus and creating space for uninterrupted work.",
    tag: "Idea",
    status: "Backlog",
    pinned: false,
    updated: Date.now() - 1,
  },
  {
    id: "checklist",
    title: "Android release checklist",
    body: "Verify the Capacitor build, test offline behavior, and prepare the distribution manifest.",
    tag: "Urgent",
    status: "Completed",
    pinned: false,
    updated: Date.now() - 2,
  },
];
class WorkspaceDB extends Dexie {
  notes!: Table<Note, string>;
  queue!: Table<Mutation, number>;
  sessions!: Table<
    { id: string; at: number; minutes: number; task: string },
    string
  >;
  vault!: Table<VaultEntry, string>;
  constructor() {
    super("aether-flow");
    this.version(1).stores({
      notes: "id, updated",
      queue: "++id,state",
      sessions: "id,at",
      vault: "id",
    });
    this.on("populate", () => this.notes.bulkAdd(seed));
  }
}
export const db = new WorkspaceDB();
export async function mutate(
  note: Note,
  kind: Mutation["kind"],
  enqueue: boolean,
) {
  await db.transaction("rw", db.notes, db.queue, async () => {
    if (kind === "Saved") await db.notes.put(note);
    else await db.notes.delete(note.id);
    if (enqueue)
      await db.queue.add({
        noteId: note.id,
        kind,
        at: Date.now(),
        payload: kind === "Saved" ? note : undefined,
        state: "pending",
      });
  });
}
let syncing = false;
export async function sync(progress: (value: number) => void = () => {}) {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const entries = await db.queue.where("state").equals("pending").toArray();
    progress(0);
    for (const [i, row] of entries.entries()) {
      await new Promise((r) => setTimeout(r, 150));
      if (!navigator.onLine) break;
      await db.queue.update(row.id!, { state: "simulated" });
      progress((i + 1) / entries.length);
    }
    if (!entries.length) progress(1);
  } finally {
    syncing = false;
  }
}
