import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollText, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("custody_log").select("*").order("created_at", { ascending: false }).limit(500);
      setLogs(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((d: any) => d.actor_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
        setProfiles(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p])));
      }
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const actor = profiles[l.actor_id]?.display_name || profiles[l.actor_id]?.email || "";
    return (
      l.action.toLowerCase().includes(q) ||
      actor.toLowerCase().includes(q) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of every action performed on the ledger"
        icon={<ScrollText className="h-6 w-6" />}
      />

      <Card className="glow-card p-4 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search action, actor, or details…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="glow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No logs.</TableCell></TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {format(new Date(l.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{l.action}</span>
                  </TableCell>
                  <TableCell className="text-sm">{profiles[l.actor_id]?.display_name || profiles[l.actor_id]?.email || "—"}</TableCell>
                  <TableCell>
                    {l.evidence_id ? (
                      <Link to={`/evidence/${l.evidence_id}`} className="font-mono text-xs text-primary">
                        {l.details?.block_number ? `#${l.details.block_number}` : l.evidence_id.slice(0, 8)}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-md truncate">
                    {l.details ? JSON.stringify(l.details) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
