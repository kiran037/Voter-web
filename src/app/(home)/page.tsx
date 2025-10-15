import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Never serve a cached logged-out shell
export const dynamic = "force-dynamic";

export default async function HomePageServer() {
  const jar = await cookies();
  const token = jar.get(process.env.SESSION_COOKIE_NAME || "session")?.value;

  if (!token) {
    redirect("/signin?next=/");
  }

  const HomeClient = (await import("./HomeClient")).default;
  return <HomeClient />;
}
