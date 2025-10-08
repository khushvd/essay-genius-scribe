import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { EssayDetailView } from "./EssayDetailView";

export const EssaysOverview = () => {
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEssay, setSelectedEssay] = useState<any>(null);

  useEffect(() => {
    fetchEssays();
  }, []);

  const fetchEssays = async () => {
    try {
      const { data, error } = await supabase
        .from('essays')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          colleges (
            name,
            country
          ),
          programmes (
            name
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching essays:', error);
        
        // Check for RLS policy errors
        if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
          toast.error("Access denied: You don't have admin permissions. Please contact support.");
        } else {
          toast.error(`Failed to load essays: ${error.message}`);
        }
        throw error;
      }
      
      setEssays(data || []);
    } catch (error) {
      console.error('Error fetching essays:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEssays = essays.filter(essay => {
    const searchLower = searchTerm.toLowerCase();
    return (
      essay.title?.toLowerCase().includes(searchLower) ||
      essay.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      essay.profiles?.email?.toLowerCase().includes(searchLower) ||
      essay.colleges?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (selectedEssay) {
    return (
      <EssayDetailView 
        essay={selectedEssay} 
        onBack={() => setSelectedEssay(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">All Essays</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search essays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading essays...
        </div>
      ) : filteredEssays.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No essays found
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEssays.map((essay) => (
            <Card key={essay.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{essay.title || "Untitled Essay"}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    By {essay.profiles?.full_name} ({essay.profiles?.email})
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{essay.colleges?.name || essay.custom_college_name || "No college"}</span>
                    <span>•</span>
                    <span>{essay.programmes?.name || essay.custom_programme_name || "No programme"}</span>
                    <span>•</span>
                    <span>{essay.degree_level}</span>
                    <span>•</span>
                    <span>{new Date(essay.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEssay(essay)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
