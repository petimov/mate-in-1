import { PlatbaUspechRedirect } from "@/components/platba-uspech-redirect";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function PlatbaUspechPage() {
  return (
    <PageShell>
      <PlatbaUspechRedirect />
    </PageShell>
  );
}
