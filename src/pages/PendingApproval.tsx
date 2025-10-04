import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

const PendingApproval = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .single();

      if (profile?.account_status === "approved") {
        navigate("/dashboard");
      } else if (profile?.account_status === "rejected") {
        toast.error("Your account has been rejected");
      } else if (profile?.account_status === "suspended") {
        toast.error("Your account has been suspended");
      }
    };

    checkStatus();

    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Account Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Logged in as: <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <p className="text-muted-foreground">
                Your account is currently under review by our administrators.
                You'll receive an email notification once your account has been approved.
              </p>
              
              <p className="text-sm text-muted-foreground">
                This typically takes 24-48 hours. Thank you for your patience!
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
