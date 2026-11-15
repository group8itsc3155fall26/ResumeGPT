import { db, requireText, type Resume } from "./db";

export type NewResume = {
  userId: number;
  title: string;
  date: string;
};

export async function listResumes(userId: number): Promise<Resume[]> {
  const rows = await db.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(({ id, title, date }) => ({ id, title, date }));
}

export async function createResume(input: NewResume): Promise<Resume> {
  const row = await db.resume.create({
    data: {
      userId: input.userId,
      title: requireText(input.title, "Resume title"),
      date: requireText(input.date, "Resume date"),
    },
  });
  return { id: row.id, title: row.title, date: row.date };
}

export async function deleteResume(userId: number, id: number): Promise<boolean> {
  const { count } = await db.resume.deleteMany({ where: { id, userId } });
  return count > 0;
}
