// Hook for auto-saving essay content with debouncing
import { useState, useEffect, useMemo, useCallback } from 'react';
import { essaysService } from '@/services/essays.service';
import { debounce } from '@/lib/utils/debounce';

interface UseAutoSaveOptions {
  essayId: string;
  content: string;
  originalContent: string;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
}

export const useAutoSave = ({
  essayId,
  content,
  originalContent,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveResult => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveContent = useCallback(async (newContent: string) => {
    setIsSaving(true);
    
    const result = await essaysService.updateEssay(essayId, { 
      content: newContent 
    });

    setIsSaving(false);
    
    if (result.success) {
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } else {
      console.error('Auto-save failed:', result.error);
    }
  }, [essayId]);

  const debouncedSave = useMemo(
    () => debounce(saveContent, debounceMs),
    [saveContent, debounceMs]
  );

  useEffect(() => {
    if (enabled !== false && content !== originalContent) {
      setHasUnsavedChanges(true);
      debouncedSave(content);
    }
  }, [content, originalContent, debouncedSave, enabled]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving || content !== originalContent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving, content, originalContent]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow: () => saveContent(content),
  };
};
