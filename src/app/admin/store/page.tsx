import { StoreAdminClient } from "./StoreAdminClient";

export default function StoreAdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">매장 관리</h1>
      <StoreAdminClient />
    </main>
  );
}
