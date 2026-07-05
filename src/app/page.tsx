import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HomeClient from "./home-client";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return <HomeClient session={session} />;
}
