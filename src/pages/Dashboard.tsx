import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Database, ShieldCheck, Upload, Activity, Boxes, Clock } from "lucide-react";
import { shortHash } from "@/lib/hash";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalEvidence: number;
  verifiedToday: number;
  totalActors: number;
  blockHeight: number;
}

export default function Dashboard() {
  const { roles } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalEvidence: 0, verifiedToday: 0, totalActors: 0, blockHeight: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { data: top }, { data: latestBlock }, { data: acts }] = await Promise.all([
        supabase.from("evidence_ledger").select("*", { count: "exact", head: true }),
        supabase.from("evidence_ledger").select("*").order("block_number", { ascending: false }).limit(5),
        supabase.from("evidence_ledger").select("block_number").order("block_number", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("custody_log").select("*").order("created_at", { ascending: false }).limit(8),
      ]);

      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { count: verified } = await supabase
        .from("custody_log").select("*", { count: "exact", head: true })
        .eq("action", "VERIFIED").gte("created_at", since.toISOString());

      const { count: actorCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

      setStats({
        totalEvidence: total ?? 0,
        verifiedToday: verified ?? 0,
        totalActors: actorCount ?? 0,
        blockHeight: latestBlock?.block_number ?? 0,
      });
      setRecent(top ?? []);
      setActivity(acts ?? []);
    })();
  }, []);

  const canUpload = roles.includes("officer") || roles.includes("admin");

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time view of the evidence ledger and recent custody activity"
        icon={<LayoutDashboard className="h-6 w-6" />}
        actions={
          canUpload && (
            <Link to="/upload">
              <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
                <Upload className="h-4 w-4" /> Register Evidence
              </Button>
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Database className="h-5 w-5" />} label="Total Evidence" value={stats.totalEvidence} />
        <StatCard icon={<Boxes className="h-5 w-5" />} label="Block Height" value={stats.blockHeight} />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Verified Today" value={stats.verifiedToday} />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Registered Users" value={stats.totalActors} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Blocks */}
        <Card className="glow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Recent Blocks</h2>
            <Link to="/registry" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No evidence registered yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <Link key={e.id} to={`/evidence/${e.id}`}
                  className="flex items-center justify-between p-3 rounded-md bg-secondary/30 hover:bg-secondary/60 border border-border hover:border-primary/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-primary">#{e.block_number}</span>
                      <span className="text-sm font-medium truncate">{e.file_name}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">{shortHash(e.block_hash, 16, 12)}</div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Activity */}
        <Card className="glow-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-primary" /> Live Custody Feed</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_hsl(var(--primary))]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{a.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {a.details && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {a.details.file_name || a.details.case_id || a.details.hash?.slice(0, 16)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="glow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-3xl font-bold tracking-tight font-mono">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </Card>
  );
}
