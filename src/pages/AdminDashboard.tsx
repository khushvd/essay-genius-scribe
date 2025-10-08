import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { EssaysOverview } from "@/components/admin/EssaysOverview";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { PortfolioManager } from "@/components/admin/PortfolioManager";
import { UserManagement } from "@/components/admin/UserManagement";
import { TrainingDataReview } from "@/components/admin/TrainingDataReview";

interface AdminDashboardProps {
  user: any;
  profile: any;
}

const AdminDashboard = ({ user, profile }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("essays");
  const { signOut: handleSignOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto p-8">
          <div className="text-center py-12 text-muted-foreground">
            Verifying permissions...
          </div>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access Denied: You don't have admin permissions. If you believe this is an error, please contact support.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-serif">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Sandwich Essay Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="essays">Essays</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="training">Training Data</TabsTrigger>
          </TabsList>

          <TabsContent value="essays">
            <EssaysOverview />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioManager />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="training">
            <TrainingDataReview />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
