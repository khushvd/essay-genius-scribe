import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PenLine, BookOpen, Sparkles, Target } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-hero mb-6 shadow-medium">
            <PenLine className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-6">
            Sandwich Essay Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Professional essay editing with hyperpersonalized recommendations 
            based on Sandwich's winning formula and successful applications to your target colleges.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-soft">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-serif mb-2">College-Specific Guidance</h3>
            <p className="text-muted-foreground">
              Get recommendations tailored to specific colleges and programmes based on proven success patterns.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-serif mb-2">Expert-Backed Analysis</h3>
            <p className="text-muted-foreground">
              Our methodology trained on top-performing essays provides intelligent, contextual suggestions based on Sandwich's winning formula.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-serif mb-2">Consistent Quality</h3>
            <p className="text-muted-foreground">
              Ensure consistency across all essays with standardized editing guidelines and style preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
