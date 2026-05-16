import { Metadata } from "next";
import { listAllBanners } from "@/app/actions/banner";
import { EventsAdminClient } from "./EventsAdminClient";

export const metadata: Metadata = {
  title: "이벤트 관리 | 런하우스 관리자",
};

export default async function EventsAdminPage() {
  const result = await listAllBanners();
  return (
    <EventsAdminClient
      initialBanners={result.banners}
      migrationMissing={result.migrationMissing}
      errorMessage={result.errorMessage}
    />
  );
}
