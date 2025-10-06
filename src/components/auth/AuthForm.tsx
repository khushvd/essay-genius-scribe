import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { authService } from "@/services/auth.service";
import { profilesService } from "@/services/profiles.service";
import { authValidationSchema } from "@/lib/validation/schemas";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validationData = isLogin 
        ? { email, password }
        : { email, password, fullName };
      
      const parsed = authValidationSchema.safeParse(validationData);
      if (!parsed.success) {
        toast.error(parsed.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const result = await authService.signIn({ email, password });
        if (!result.success) {
          toast.error(result.error.message);
          setLoading(false);
          return;
        }

        const profileResult = await profilesService.getProfile(result.data.user.id);
        if (!profileResult.success) {
          toast.error('Unable to verify account status');
          await authService.signOut();
          setLoading(false);
          return;
        }

        const { account_status } = profileResult.data;
        if (account_status === 'pending') {
          toast.info('Your account is pending approval');
          navigate("/pending-approval");
        } else if (account_status === 'rejected' || account_status === 'suspended') {
          toast.error(`Your account has been ${account_status}. Please contact support.`);
          await authService.signOut();
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      } else {
        const result = await authService.signUp({ email, password, fullName: fullName || '' });
        if (!result.success) {
          toast.error(result.error.message);
          setLoading(false);
          return;
        }
        toast.success("Account created successfully! Awaiting approval.");
        navigate("/pending-approval");
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-hero mb-4 shadow-medium">
            <PenLine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-serif mb-2">Sandwich Essay Platform</h1>
          <p className="text-muted-foreground">Professional essay editing and guidance</p>
        </div>

        <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
          <div className="flex gap-2 mb-6">
            <Button variant={isLogin ? "default" : "outline"} className="flex-1" onClick={() => setIsLogin(true)}>Sign In</Button>
            <Button variant={!isLogin ? "default" : "outline"} className="flex-1" onClick={() => setIsLogin(false)}>Sign Up</Button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required={!isLogin} placeholder="John Doe" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
