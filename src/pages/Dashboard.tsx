import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, FileText } from "lucide-react";
import { EssayList } from "@/components/dashboard/EssayList";
import { NewEssayDialog } from "@/components/dashboard/NewEssayDialog";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "./AdminDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showNewEssay, setShowNewEssay] = useState(false);
  const { user, profile, loading, isAdmin, signOut, checkAccountStatus } = useAuth();

  useEffect(() => {
    // Early return if still loading
    if (loading) return;
    
    // Check authentication
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Check account status
    const status = checkAccountStatus();
    if (status === 'rejected' || status === 'suspended') {
      navigate("/auth");
    }
  }, [user, loading, navigate, checkAccountStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect admins to admin dashboard
  if (isAdmin && user && profile) {
    return <AdminDashboard user={user} profile={profile} />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif">Sandwich</h1>
              <p className="text-sm text-muted-foreground">Essay Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold font-serif mb-2">Your Essays</h2>
            <p className="text-muted-foreground">Create and manage your college application essays</p>
          </div>
          <Button onClick={() => setShowNewEssay(true)} className="shadow-soft">
            <Plus className="w-4 h-4 mr-2" />
            New Essay
          </Button>
        </div>

        <EssayList userId={user?.id} />
      </main>

      <NewEssayDialog 
        open={showNewEssay} 
        onOpenChange={setShowNewEssay}
        userId={user?.id}
      />
    </div>
  );
};

export default Dashboard;
