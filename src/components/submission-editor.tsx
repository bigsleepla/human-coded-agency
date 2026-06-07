import { useEffect, useState } from "react";
import { supabase, type SubmissionStatus } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Author {
  name: string;
  reddit_url: string;
}

interface SubmissionEditorProps {
  submissionId: string | null;
  initialSlotId: string | null;
  onDone: () => void;
}

export function SubmissionEditor({ submissionId, initialSlotId, onDone }: SubmissionEditorProps) {
  const { agency } = useAuth();
  const [slots, setSlots] = useState<{ id: string; topic: string; subreddit: string }[]>([]);
  const [slotId, setSlotId] = useState<string | null>(initialSlotId);
  const [title, setTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [content, setContent] = useState("");
  const [authors, setAuthors] = useState<Author[]>([{ name: "", reddit_url: "" }]);
  const [publishDate, setPublishDate] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(submissionId ? false : true);

  useEffect(() => {
    if (agency && !brandName) setBrandName(agency.brand_name);
  }, [agency, brandName]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("slots")
        .select("id, topic, subreddit")
        .order("topic");
      setSlots((data as { id: string; topic: string; subreddit: string }[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();
      if (data) {
        setSlotId(data.slot_id ?? null);
        setTitle(data.title ?? "");
        setBrandName(data.brand_name ?? "");
        setContent(data.content ?? "");
        const a = Array.isArray(data.authors) ? (data.authors as Author[]) : [];
        setAuthors(a.length ? a : [{ name: "", reddit_url: "" }]);
        setPublishDate(data.requested_publish_date ?? "");
        setWindowStart(data.engagement_window_start ?? "");
        setWindowEnd(data.engagement_window_end ?? "");
      }
      setLoaded(true);
    })();
  }, [submissionId]);

  const save = async (status: SubmissionStatus) => {
    if (!agency) return;
    if (!slotId) {
      toast.error("Pick a slot first.");
      return;
    }
    setBusy(true);
    const payload = {
      agency_id: agency.id,
      slot_id: slotId,
      title,
      brand_name: brandName,
      content,
      authors: authors.filter((a) => a.name.trim() || a.reddit_url.trim()),
      requested_publish_date: publishDate || null,
      engagement_window_start: windowStart || null,
      engagement_window_end: windowEnd || null,
      status,
    };
    const { error } = submissionId
      ? await supabase.from("submissions").update(payload).eq("id", submissionId)
      : await supabase.from("submissions").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "draft" ? "Draft saved." : "Submitted.");
    onDone();
  };

  if (!loaded) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold">
        {submissionId ? "Edit submission" : "New submission"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Save as draft to keep editing, or submit when ready.
      </p>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Slot</Label>
          <Select value={slotId ?? ""} onValueChange={(v) => setSlotId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a slot…" />
            </SelectTrigger>
            <SelectContent>
              {slots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.topic} — r/{s.subreddit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Authors</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAuthors((p) => [...p, { name: "", reddit_url: "" }])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add author
            </Button>
          </div>
          <div className="space-y-2">
            {authors.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={a.name}
                  onChange={(e) =>
                    setAuthors((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <Input
                  placeholder="https://reddit.com/user/…"
                  value={a.reddit_url}
                  onChange={(e) =>
                    setAuthors((p) =>
                      p.map((x, idx) => (idx === i ? { ...x, reddit_url: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAuthors((p) => p.filter((_, idx) => idx !== i))}
                  disabled={authors.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Article / whitepaper content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="Paste the full content here…"
            className="font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Requested publish date</Label>
            <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Engagement window start</Label>
            <Input type="datetime-local" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Engagement window end</Label>
            <Input type="datetime-local" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" disabled={busy} onClick={() => save("draft")}>
            Save as Draft
          </Button>
          <Button disabled={busy} onClick={() => save("submitted")}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
