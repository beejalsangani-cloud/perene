import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(process.cwd(), "data", "waitlist.json");

function readWaitlist() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeWaitlist(list) {
  writeFileSync(DATA_PATH, JSON.stringify(list, null, 2));
}

export async function POST(request) {
  const { email } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  const waitlist = readWaitlist();
  const normalised = email.toLowerCase().trim();

  if (waitlist.some((e) => e.email === normalised)) {
    return Response.json({ message: "You're already on the waitlist!" }, { status: 200 });
  }

  waitlist.push({ email: normalised, joinedAt: new Date().toISOString() });
  writeWaitlist(waitlist);

  return Response.json({ message: "You're on the list!" }, { status: 201 });
}
