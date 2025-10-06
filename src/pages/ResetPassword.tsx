import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authValidationSchema } from "@/lib/validation/schemas";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // Handle password reset token exchange
    if (token && type === 'recovery') {
      supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      }).catch((error) => {
        console.error('Token verification error:', error);
        toast.error('Invalid or expired reset link. Please request a new one.');
        navigate('/auth');
      });
    } else if (!token) {
      toast.error('Invalid reset link');
      navigate('/auth');
    }
  }, [searchParams, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Validate password strength
      const parsed = authValidationSchema.safeParse({ 
        email: "dummy@example.com", // Required by schema but not used
        password 
      });
      
      if (!parsed.success) {
        toast.error(parsed.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
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
          <h1 className="text-3xl font-bold font-serif mb-2">Reset Password</h1>
          <p className="text-muted-foreground">Enter your new password</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••"
                minLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 10 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••••"
                minLength={10}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
