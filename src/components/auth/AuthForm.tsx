import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { authService } from "@/services/auth.service";
import { profilesService } from "@/services/profiles.service";
import { authValidationSchema } from "@/lib/validation/schemas";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

export const AuthForm = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();

  // Pre-fill email from URL query parameter (e.g., from invite email)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setIsLogin(true); // Default to login mode when email is pre-filled
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only validate signup - login is handled server-side
      if (!isLogin) {
        const parsed = authValidationSchema.safeParse({ email, password, fullName });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        const result = await authService.signIn({ email, password });
        if (!result.success) {
          toast.error(result.error.message);
          setLoading(false);
          return;
        }

        // First attempt to fetch profile
        let profileResult = await profilesService.getProfile(result.data.user.id);
        
        // Retry once if failed
        if (!profileResult.success) {
          console.log('Profile fetch failed, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          profileResult = await profilesService.getProfile(result.data.user.id);
          
          // If retry also fails, show error but DON'T sign out
          if (!profileResult.success) {
            toast.error('Unable to load profile. Please refresh the page.');
            setLoading(false);
            return;
          }
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setForgotPasswordOpen(true)}
                  >
                    Forgot password?
                  </Button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={isLogin ? undefined : 10} />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Must be at least 10 characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>
      </div>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </div>
  );
};
