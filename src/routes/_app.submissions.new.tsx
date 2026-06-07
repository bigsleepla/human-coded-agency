import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SubmissionEditor } from "@/components/submission-editor";
import { z } from "zod";

const search = z.object({
  slotId: z.string().optional(),
});

export const Route = createFileRoute("/_app/submissions/new")({
  validateSearch: search,
  component: NewSubmissionPage,
});

function NewSubmissionPage() {
  const { slotId } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <SubmissionEditor
      submissionId={null}
      initialSlotId={slotId ?? null}
      onDone={() => navigate({ to: "/submissions" })}
    />
  );
}
