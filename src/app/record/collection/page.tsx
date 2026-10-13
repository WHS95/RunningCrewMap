// src/app/record/collection/page.tsx — 07 3D 턴테이블 쇼케이스 (캔버스 시안 Showcase3D.dc.html)
import { RecordShell, RecordSubHeader } from "@/components/record/RecordShell";
import { CollectionClient } from "@/components/record/CollectionClient";

export default function RecordCollectionPage() {
  return (
    <RecordShell>
      <RecordSubHeader title="각인 액세서리" backHref="/record" meta="3D · 360°" />
      <CollectionClient />
    </RecordShell>
  );
}
