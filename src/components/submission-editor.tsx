import { useEffect, useState } from "react";
import { supabase, type SubmissionStatus } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus,
  Trash2,
  Pencil,
  FileText,
  Users,
  Calendar,
  Send,
  Save,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl space-y-6 p-6 md:p-8">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Pencil className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {submissionId ? "Edit submission" : "New submission"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Save as draft to keep editing, or submit when ready.
            </p>
          </div>
        </div>

        <Section icon={Hash} title="Slot" description="Which editorial slot is this for?">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available.</p>
          ) : (
            <RadioGroup
              value={slotId ?? ""}
              onValueChange={(v) => setSlotId(v)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {slots.map((s) => {
                const active = slotId === s.id;
                return (
                  <label
                    key={s.id}
                    htmlFor={`slot-${s.id}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-all duration-150",
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <RadioGroupItem id={`slot-${s.id}`} value={s.id} className="mt-1" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        r/{s.subreddit}
                      </div>
                      <div className="truncate text-sm font-semibold">{s.topic}</div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}
        </Section>

        <Section icon={FileText} title="Article" description="The piece you're submitting.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand name</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Article / whitepaper content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder="Paste the full content here…"
              className="rounded-2xl font-mono text-sm"
            />
          </div>
        </Section>

        <Section icon={Users} title="Authors" description="Who's credited on this piece?">
          <div className="space-y-2">
            {authors.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={a.name}
                  onChange={(e) =>
                    setAuthors((p) =>
                      p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className="h-11 rounded-xl"
                />
                <Input
                  placeholder="https://reddit.com/user/…"
                  value={a.reddit_url}
                  onChange={(e) =>
                    setAuthors((p) =>
                      p.map((x, idx) => (idx === i ? { ...x, reddit_url: e.target.value } : x)),
                    )
                  }
                  className="h-11 rounded-xl"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAuthors((p) => [...p, { name: "", reddit_url: "" }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add author
            </Button>
          </div>
        </Section>

        <Section icon={Calendar} title="Schedule" description="When should this run?">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Publish date</Label>
              <Input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Engagement start</Label>
              <Input
                type="datetime-local"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Engagement end</Label>
              <Input
                type="datetime-local"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save("draft")}>
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
          <Button disabled={busy} onClick={() => save("submitted")}>
            <Send className="h-4 w-4" /> Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Pencil;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
