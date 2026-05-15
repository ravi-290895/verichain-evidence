import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  // Sign up
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPwd, setSignUpPwd] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [badgeId, setBadgeId] = useState("");

  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password: signInPwd });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: displayName, badge_id: badgeId },
      },
    });
    if (!error) {
      // Update profile fields after signup
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from("profiles").update({ display_name: displayName, badge_id: badgeId }).eq("id", newUser.id);
      }
    }
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Account created");
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_24px_hsl(var(--primary)/0.5)]">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">ChainCustody</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Evidence Registry</div>
          </div>
        </Link>

        <Card className="glow-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} placeholder="officer@agency.gov" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pwd">Password</Label>
                  <Input id="si-pwd" type="password" required value={signInPwd} onChange={(e) => setSignInPwd(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Display Name</Label>
                    <Input id="su-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="J. Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-badge">Badge ID</Label>
                    <Input id="su-badge" value={badgeId} onChange={(e) => setBadgeId(e.target.value)} placeholder="B-1042" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pwd">Password</Label>
                  <Input id="su-pwd" type="password" required minLength={6} value={signUpPwd} onChange={(e) => setSignUpPwd(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">First account becomes Admin. Subsequent accounts default to Officer until reassigned.</p>
                <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold hover:opacity-90">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
