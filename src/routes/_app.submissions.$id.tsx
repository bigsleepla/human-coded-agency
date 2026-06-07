import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SubmissionEditor } from "@/components/submission-editor";

export const Route = createFileRoute("/_app/submissions/$id")({
  component: EditSubmissionPage,
});

function EditSubmissionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return (
    <SubmissionEditor
      submissionId={id}
      initialSlotId={null}
      onDone={() => navigate({ to: "/submissions" })}
    />
  );
}
