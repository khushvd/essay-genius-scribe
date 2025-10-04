import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NewEssayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const NewEssayDialog = ({ open, onOpenChange, userId }: NewEssayDialogProps) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [collegeId, setCollegeId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [colleges, setColleges] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      let query = supabase
        .from("colleges")
        .select("*")
        .order("name");
      
      if (selectedCountry !== "all") {
        query = query.eq("country", selectedCountry);
      }
      
      const { data } = await query;
      if (data) setColleges(data);
    };

    fetchColleges();
  }, [selectedCountry]);

  useEffect(() => {
    const fetchProgrammes = async () => {
      if (!collegeId) {
        setProgrammes([]);
        return;
      }

      const { data } = await supabase
        .from("programmes")
        .select("*")
        .eq("college_id", collegeId)
        .order("name");
      
      if (data) setProgrammes(data);
    };

    fetchProgrammes();
  }, [collegeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("essays")
        .insert({
          writer_id: userId,
          title,
          content,
          college_id: collegeId || null,
          programme_id: programmeId || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Essay created successfully!");
      onOpenChange(false);
      navigate(`/editor/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create New Essay</DialogTitle>
          <DialogDescription>
            Start a new essay draft for your college application
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Essay Prompt (if any)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Describe a challenge you overcame..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Select value={collegeId} onValueChange={setCollegeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="programme">Programme</Label>
              <Select 
                value={programmeId} 
                onValueChange={setProgrammeId}
                disabled={!collegeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Initial Draft</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your essay here..."
              rows={8}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Essay"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
