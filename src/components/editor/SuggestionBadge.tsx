import { AlertCircle, Lightbulb, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SuggestionBadgeProps {
  type: "critical" | "enhancement" | "personalization";
}

const SuggestionBadge = ({ type }: SuggestionBadgeProps) => {
  const config = {
    critical: {
      icon: AlertCircle,
      label: "Critical",
      variant: "destructive" as const,
    },
    enhancement: {
      icon: Lightbulb,
      label: "Enhancement",
      variant: "secondary" as const,
    },
    personalization: {
      icon: User,
      label: "Personalization",
      variant: "outline" as const,
    },
  };

  const { icon: Icon, label, variant } = config[type];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default SuggestionBadge;
