import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ALL_ROLES = ["admin", "officer", "investigator", "judge"] as const;

export default function AdminUsers() {
  const { refreshRoles, user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});
  const [adding, setAdding] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(profs ?? []);
    const { data: roles } = await supabase.from("user_roles").select("*");
    const map: Record<string, string[]> = {};
    (roles ?? []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    setRoleMap(map);
  };

  useEffect(() => { load(); }, []);

  const addRole = async (userId: string) => {
    const role = adding[userId];
    if (!role) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) return toast.error(error.message);
    toast.success("Role assigned");
    setAdding((s) => ({ ...s, [userId]: "" }));
    if (userId === me?.id) await refreshRoles();
    load();
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) return toast.error(error.message);
    toast.success("Role removed");
    if (userId === me?.id) await refreshRoles();
    load();
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Assign roles and manage access across the system"
        icon={<Users className="h-6 w-6" />}
      />

      <Card className="glow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Badge / Dept</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-64">Assign Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const userRoles = roleMap[u.id] || [];
              const available = ALL_ROLES.filter((r) => !userRoles.includes(r));
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.display_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {u.badge_id || "—"}{u.department ? ` · ${u.department}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                      {userRoles.map((r) => (
                        <Badge key={r} variant="outline" className="border-primary/30 text-primary uppercase tracking-wider text-[10px] gap-1">
                          {r}
                          <button onClick={() => removeRole(u.id, r)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {available.length > 0 ? (
                      <div className="flex gap-2">
                        <Select value={adding[u.id] || ""} onValueChange={(v) => setAdding((s) => ({ ...s, [u.id]: v }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            {available.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => addRole(u.id)} disabled={!adding[u.id]}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">All roles assigned</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
