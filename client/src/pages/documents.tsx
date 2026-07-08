// ============================================================
// Governance Document Library — constitution, policies, minutes,
// financial records. Admins upload; all members can read.
// Route: add to App.tsx -> <Route path="/documents" component={Documents} />
// ============================================================
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, Download, FileText, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";

interface Doc {
  id: string;
  title: string;
  category: string;
  description: string | null;
  originalName: string;
  fileSize: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "constitution", label: "Constitution", color: "bg-purple-100 text-purple-800" },
  { value: "policy", label: "Policy", color: "bg-blue-100 text-blue-800" },
  { value: "minutes", label: "Minutes", color: "bg-emerald-100 text-emerald-800" },
  { value: "financial", label: "Financial", color: "bg-amber-100 text-amber-800" },
  { value: "correspondence", label: "Correspondence", color: "bg-pink-100 text-pink-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700" },
];

function prettySize(bytes: number) {
  if (bytes > 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "president";
  const [filter, setFilter] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [meta, setMeta] = useState({ title: "", category: "policy", description: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery<Doc[]>({ queryKey: ["/api/documents"] });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Choose a file first");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", meta.title || file.name);
      fd.append("category", meta.category);
      fd.append("description", meta.description);
      const res = await fetch("/api/documents", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.text()) || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setUploadOpen(false);
      setMeta({ title: "", category: "policy", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded" });
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/documents"] }),
  });

  const visible = filter === "all" ? docs : docs.filter((d) => d.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Governance Documents
          </h1>
          {isAdmin && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button><Upload className="h-4 w-4 mr-2" /> Upload</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload governance document</DialogTitle>
                  <DialogDescription>Visible to all EXCO members.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>File (PDF / Word / image)</Label>
                    <Input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={meta.title} placeholder="e.g. NKF Constitution (2024 amendment)"
                      onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={meta.category} onValueChange={(v) => setMeta({ ...meta, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea rows={2} value={meta.description}
                      onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Uploading…" : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({docs.length})
          </Button>
          {CATEGORIES.map((c) => {
            const n = docs.filter((d) => d.category === c.value).length;
            if (!n) return null;
            return (
              <Button key={c.value} size="sm" variant={filter === c.value ? "default" : "outline"}
                onClick={() => setFilter(c.value)}>
                {c.label} ({n})
              </Button>
            );
          })}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && visible.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No documents yet. {isAdmin ? "Upload the constitution first — it powers the context panels in every chat room." : "An administrator will upload governance documents here."}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {visible.map((d) => {
            const cat = CATEGORIES.find((c) => c.value === d.category);
            return (
              <Card key={d.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.originalName} · {prettySize(d.fileSize)} · {format(new Date(d.createdAt), "d MMM yyyy")}
                    </div>
                    {d.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.description}</div>}
                  </div>
                  <Badge className={cat?.color ?? ""}>{cat?.label ?? d.category}</Badge>
                  <a href={`/api/documents/${d.id}/download`}>
                    <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                  </a>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(d.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
