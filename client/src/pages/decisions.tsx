// ============================================================
// Decision Register — formal motions with open/anonymous voting.
// Route: add to App.tsx ->  <Route path="/decisions" component={Decisions} />
// ============================================================
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Vote, PlusCircle, CheckCircle2, XCircle, MinusCircle, Lock, Users } from "lucide-react";
import { format } from "date-fns";

interface DecisionView {
  id: string;
  title: string;
  motion: string;
  context: string | null;
  status: "draft" | "open" | "passed" | "rejected" | "withdrawn";
  voteType: "open" | "anonymous";
  proposedBy: string;
  proposerName: string;
  quorum: number | null;
  closesAt: string | null;
  decidedAt: string | null;
  outcomeNotes: string | null;
  createdAt: string;
  tally: { for: number; against: number; abstain: number; total: number };
  myVote: "for" | "against" | "abstain" | null;
  voters?: Array<{ name: string; choice: string }>;
}

const statusColor: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  passed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-600",
  draft: "bg-blue-100 text-blue-800",
};

export default function Decisions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", motion: "", context: "", anonymous: false, closesAt: "" });

  const { data: decisions = [], isLoading } = useQuery<DecisionView[]>({
    queryKey: ["/api/decisions"],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/decisions", "POST", {
        title: form.title,
        motion: form.motion,
        context: form.context || undefined,
        voteType: form.anonymous ? "anonymous" : "open",
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setForm({ title: "", motion: "", context: "", anonymous: false, closesAt: "" });
      invalidate();
      toast({ title: "Motion proposed", description: "Voting is now open." });
    },
    onError: (e: Error) => toast({ title: "Could not propose motion", description: e.message, variant: "destructive" }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, choice }: { id: string; choice: string }) =>
      apiRequest(`/api/decisions/${id}/vote`, "POST", { choice }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: "Vote failed", description: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/decisions/${id}/close`, "POST", {}),
    onSuccess: () => {
      invalidate();
      toast({ title: "Decision closed", description: "The outcome has been recorded." });
    },
    onError: (e: Error) => toast({ title: "Could not close", description: e.message, variant: "destructive" }),
  });

  const openDecisions = decisions.filter((d) => d.status === "open");
  const closedDecisions = decisions.filter((d) => d.status !== "open");
  const isAdmin = user?.role === "admin" || user?.role === "president";

  const renderDecision = (d: DecisionView) => {
    const pct = (n: number) => (d.tally.total ? Math.round((n / d.tally.total) * 100) : 0);
    return (
      <Card key={d.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {d.voteType === "anonymous" && <Lock className="h-4 w-4 text-muted-foreground" />}
                {d.title}
              </CardTitle>
              <CardDescription>
                Proposed by {d.proposerName} · {format(new Date(d.createdAt), "d MMM yyyy")}
                {d.closesAt && d.status === "open" && <> · closes {format(new Date(d.closesAt), "d MMM yyyy")}</> }
              </CardDescription>
            </div>
            <Badge className={statusColor[d.status]}>{d.status.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap">{d.motion}</p>
          {d.context && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.context}</p>}

          {/* Tally bars */}
          <div className="space-y-1.5">
            {([
              ["for", "For", "text-emerald-600"],
              ["against", "Against", "text-red-600"],
              ["abstain", "Abstain", "text-gray-500"],
            ] as const).map(([key, label, color]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={`w-16 font-medium ${color}`}>{label}</span>
                <Progress value={pct(d.tally[key])} className="h-2 flex-1" />
                <span className="w-14 text-right text-muted-foreground">
                  {d.tally[key]} ({pct(d.tally[key])}%)
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Users className="h-3 w-3" /> {d.tally.total} vote{d.tally.total === 1 ? "" : "s"} cast
              {d.quorum && <> · quorum {d.quorum}</> }
              {d.voteType === "anonymous" && <> · ballot is anonymous</> }
            </div>
          </div>

          {/* Open voters list (open ballots only) */}
          {d.voteType === "open" && d.voters && d.voters.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {d.voters.map((v) => `${v.name} (${v.choice})`).join(" · ")}
            </div>
          )}

          {/* Voting buttons */}
          {d.status === "open" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant={d.myVote === "for" ? "default" : "outline"}
                onClick={() => voteMutation.mutate({ id: d.id, choice: "for" })}
              >
                <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" /> For
              </Button>
              <Button
                size="sm"
                variant={d.myVote === "against" ? "default" : "outline"}
                onClick={() => voteMutation.mutate({ id: d.id, choice: "against" })}
              >
                <XCircle className="h-4 w-4 mr-1 text-red-600" /> Against
              </Button>
              <Button
                size="sm"
                variant={d.myVote === "abstain" ? "default" : "outline"}
                onClick={() => voteMutation.mutate({ id: d.id, choice: "abstain" })}
              >
                <MinusCircle className="h-4 w-4 mr-1 text-gray-500" /> Abstain
              </Button>
              {(isAdmin || d.proposedBy === user?.id) && (
                <Button size="sm" variant="secondary" className="ml-auto" onClick={() => closeMutation.mutate(d.id)}>
                  Close &amp; record outcome
                </Button>
              )}
            </div>
          )}

          {d.status !== "open" && d.outcomeNotes && (
            <p className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{d.outcomeNotes}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="h-6 w-6" /> Decision Register
          </h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" /> Propose Motion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose a Motion</DialogTitle>
                <DialogDescription>
                  A formal decision the EXCO will vote on. It is recorded permanently in the register.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="d-title">Title</Label>
                  <Input id="d-title" value={form.title} placeholder="e.g. Approve 2026 Nationals budget"
                    onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="d-motion">Motion (what is being decided)</Label>
                  <Textarea id="d-motion" rows={3} value={form.motion}
                    placeholder="That the EXCO approves…"
                    onChange={(e) => setForm({ ...form, motion: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="d-context">Background / context (optional)</Label>
                  <Textarea id="d-context" rows={2} value={form.context}
                    onChange={(e) => setForm({ ...form, context: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="d-closes">Voting deadline (optional)</Label>
                  <Input id="d-closes" type="date" value={form.closesAt}
                    onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" /> Anonymous ballot
                    </Label>
                    <p className="text-xs text-muted-foreground">Turnout is visible; individual choices are not.</p>
                  </div>
                  <Switch checked={form.anonymous} onCheckedChange={(v) => setForm({ ...form, anonymous: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={form.title.length < 3 || form.motion.length < 10 || createMutation.isPending}
                >
                  Open for voting
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({openDecisions.length})</TabsTrigger>
            <TabsTrigger value="closed">Decided ({closedDecisions.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="pt-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && openDecisions.length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
                No open decisions. Propose a motion to start a vote.
              </CardContent></Card>
            )}
            {openDecisions.map(renderDecision)}
          </TabsContent>
          <TabsContent value="closed" className="pt-4">
            {closedDecisions.length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
                No decided motions yet. Closed decisions form the federation's permanent governance record.
              </CardContent></Card>
            )}
            {closedDecisions.map(renderDecision)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
