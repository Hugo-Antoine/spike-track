import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  // Redirect based on authentication status
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
