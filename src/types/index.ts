export const statuses = ["Backlog", "In Flow", "Completed"] as const;
export const tags = ["Architecture", "Idea", "Urgent"] as const;
export type Note = {
  id: string;
  title: string;
  body: string;
  tag: (typeof tags)[number];
  status: (typeof statuses)[number];
  pinned: boolean;
  updated: number;
};
export type Role = "Explorer" | "Architect Pro" | "Root System Admin";
export type Mutation = {
  id?: number;
  noteId: string;
  kind: "Saved" | "Deleted";
  at: number;
  payload?: Note;
  state: "pending" | "simulated" | "conflict";
};
export type VaultEntry = { id: string; iv: ArrayBuffer; cipher: ArrayBuffer };
