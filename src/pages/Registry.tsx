import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Database, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortHash, formatBytes } from "@/lib/hash";
import { format } from "date-fns";
import { StatusPill } from "@/components/StatusPill";

export default function Registry() {
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("evidence_ledger").select("*").order("block_number", { ascending: false });
      setItems(data ?? []);
      const ids = Array.from(new Set((data ?? []).map((d: any) => d.uploader_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
        setProfiles(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p])));
      }
    })();
  }, []);

  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.file_name.toLowerCase().includes(q) ||
      i.case_id.toLowerCase().includes(q) ||
      i.file_hash.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Evidence Registry"
        description="Searchable index of every block on the ledger"
        icon={<Database className="h-6 w-6" />}
      />

      <Card className="glow-card p-4 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by file name, case ID, or hash…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono"
          />
        </div>
      </Card>

      <Card className="glow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Block</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {items.length === 0 ? "No evidence registered yet." : "No matches."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer">
                  <TableCell><Link to={`/evidence/${e.id}`} className="font-mono text-primary">#{e.block_number}</Link></TableCell>
                  <TableCell>
                    <Link to={`/evidence/${e.id}`} className="block">
                      <div className="font-medium">{e.file_name}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(e.file_size)}</div>
                    </Link>
                  </TableCell>
                  <TableCell><Link to={`/evidence/${e.id}`} className="font-mono text-sm">{e.case_id}</Link></TableCell>
                  <TableCell><Link to={`/evidence/${e.id}`} className="font-mono text-xs text-primary">{shortHash(e.file_hash)}</Link></TableCell>
                  <TableCell className="text-sm">{profiles[e.uploader_id]?.display_name || profiles[e.uploader_id]?.email || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(e.created_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell><StatusPill status="REGISTERED" /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
