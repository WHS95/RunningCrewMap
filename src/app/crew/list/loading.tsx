import { CrewItemSkeleton } from "@/components/ui/skeleton-cards";
import { CSS_VARIABLES } from "@/lib/constants";

export default function CrewListLoading() {
  return (
    <div
      className="flex flex-col min-h-screen bg-[hsl(220,15%,4%)]"
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <CrewItemSkeleton key={i} />
      ))}
    </div>
  );
}
