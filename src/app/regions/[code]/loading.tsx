import { KickerLabel } from "@/components/design/cartographic";
import { Loader2 } from "lucide-react";
import { CSS_VARIABLES } from "@/lib/constants";

export default function RegionLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] bg-background"
      style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}
    >
      <Loader2 className="w-5 h-5 text-[hsl(var(--lime))] animate-spin" />
      <KickerLabel tone="muted" className="mt-3 tracking-[0.2em]">
        · LOADING REGION
      </KickerLabel>
    </div>
  );
}
