import { redirect } from "next/navigation";

// /home is the legacy landing route — it now lives at /. Keep this file
// as a permanent redirect so old PWA install start_urls, search engine
// caches and Google indexed links keep working.
export default function HomeRedirect(): never {
  redirect("/");
}
