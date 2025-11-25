// src/components/Shell.tsx
import { getSessionUser } from "@/lib/session";
import ShellClient from "./ShellClient";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser(); // Hanya Server Component yang boleh
  return <ShellClient user={user}>{children}</ShellClient>;
}
