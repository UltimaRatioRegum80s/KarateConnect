// ============================================================
// Governance context side panel — shown alongside a chat room.
// Gives members the constitution, room documents, open votes,
// and upcoming-event countdowns WHILE they discuss.
// Usage (in chat-room.tsx):
//   <div className="flex gap-4">
//     <div className="flex-1"><MultimediaChatInterface ... /></div>
//     <ContextPanel roomId={roomId} className="hidden lg:block w-80 shrink-0" />
//   </div>
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Vote, CalendarClock, BookOpen, Download } from "lucide-react";
import { useLocation } from "wouter";

interface ContextData {
  documents: Array<{ id: string; title: string; category: string; originalName: string }>;
  constitution: Array<{ id: string; title: string }>;
  openDecisions: Array<{
    id: string;
    title: string;
    voteType: "open" | "anonymous";
    closesAt: string | null;
    tally: { for: number; against: number; abstain: number; total: number };
    myVote: string | null;
  }>;
  upcomingEvents: Array<{ id: string; title: string; eventType: string; startDate: string; location: string | null }>;
}

function daysUntil(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

export default function ContextPanel({ roomId, className = "" }: { roomId: string; className?: string }) {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<ContextData>({
    queryKey: [`/api/rooms/${roomId}/context`],
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-sm text-muted-foreground">Loading context…</CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className={className}>
      <div className="space-y-4">
        {/* Open votes */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Vote className="h-4 w-4 text-amber-500" /> Open Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.openDecisions.length === 0 && (
              <p className="text-xs text-muted-foreground">No open votes for this room.</p>
            )}
            {data.openDecisions.map((d) => (
              <div key={d.id} className="text-sm space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-tight">{d.title}</span>
                  <Badge variant={d.voteType === "anonymous" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                    {d.voteType}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {d.tally.total} vote{d.tally.total === 1 ? "" : "s"}
                  {d.closesAt && <> · closes {daysUntil(d.closesAt)}</> }
                  {d.myVote ? " · you voted" : " · you haven't voted"}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation("/decisions")}>
                  {d.myVote ? "View" : "Vote now"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming events with countdowns */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-500" /> On the Horizon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">No upcoming events.</p>
            )}
            {data.upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium leading-tight">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.eventType}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
                <Badge variant="secondary" className="shrink-0">{daysUntil(e.startDate)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Room documents */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" /> Room Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.documents.length === 0 && (
              <p className="text-xs text-muted-foreground">No documents linked to this room yet.</p>
            )}
            {data.documents.map((doc) => (
              <a
                key={doc.id}
                href={`/api/documents/${doc.id}/download`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px] shrink-0">{doc.category}</Badge>
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Constitution quick access */}
        {data.constitution.length > 0 && (
          <>
            <Separator />
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-500" /> Constitution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.constitution.map((c) => (
                  <a key={c.id} href={`/api/documents/${c.id}/download`} className="block text-sm hover:underline">
                    {c.title}
                  </a>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
