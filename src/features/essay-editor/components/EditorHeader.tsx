import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, Download, CheckCircle2, Loader2, AlertCircle, MoreHorizontal } from 'lucide-react';
import type { Essay } from '@/types/entities';

interface EditorHeaderProps {
  essay: Essay;
  isSaving: boolean;
  lastSaved: Date | null;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onExport: () => void;
  onSubmitTraining?: () => void;
  isSubmittingTraining?: boolean;
}

export const EditorHeader = ({
  essay,
  isSaving,
  lastSaved,
  saving,
  onBack,
  onSave,
  onExport,
  onSubmitTraining,
  isSubmittingTraining,
}: EditorHeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold font-serif">{essay.title}</h1>
              <p className="text-sm text-muted-foreground">
                {essay.colleges?.name} • {essay.programmes?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Save status - hidden on mobile */}
            <div className="hidden md:block text-sm text-muted-foreground">
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              ) : null}
            </div>

            {/* Desktop buttons */}
            <Button onClick={onExport} variant="outline" size="sm" className="hidden md:flex">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {onSubmitTraining && (
              <Button 
                onClick={onSubmitTraining} 
                variant="outline" 
                size="sm"
                disabled={isSubmittingTraining}
                className="hidden lg:flex"
              >
                {isSubmittingTraining ? "Submitting..." : "Submit for Training"}
              </Button>
            )}

            {/* Mobile dropdown for secondary actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export DOCX
                </DropdownMenuItem>
                {onSubmitTraining && (
                  <DropdownMenuItem onClick={onSubmitTraining} disabled={isSubmittingTraining}>
                    {isSubmittingTraining ? "Submitting..." : "Submit for Training"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save button - always visible */}
            <Button onClick={onSave} disabled={saving} size="sm">
              <Save className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{saving ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>

        {!essay.college_id || !essay.programme_id ? (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!essay.college_id && !essay.programme_id
                ? "No college or programme selected - feedback will be generic"
                : !essay.college_id
                ? "No college selected - feedback may be less personalized"
                : "No programme selected - feedback may be less personalized"}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mt-4">
            <AlertDescription className="text-muted-foreground">
              ✓ Tailored feedback for {essay.colleges?.name} - {essay.programmes?.name}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </header>
  );
};
