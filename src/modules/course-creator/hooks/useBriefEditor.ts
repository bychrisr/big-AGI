import { useState, useCallback, useMemo } from 'react';
import type { BriefData, PainPoint } from '../types';
import { BRIEF_SECTIONS, DEFAULT_BRIEF_DATA } from '../data';

interface UseBriefEditorReturn {
  activeSection: number;
  setActiveSection: (section: number) => void;
  briefData: BriefData;
  setBriefData: (data: BriefData) => void;
  isSaving: boolean;
  currentSectionData: (typeof BRIEF_SECTIONS)[number] | undefined;
  progressPercent: number;
  totalSections: number;
  sections: typeof BRIEF_SECTIONS;
  // Navigation
  canGoNext: boolean;
  canGoPrev: boolean;
  isLastSection: boolean;
  goToNextSection: () => void;
  goToPrevSection: () => void;
  // Data actions
  handleInputChange: (key: keyof BriefData, value: unknown) => void;
  addPainPoint: (text?: string, intensity?: number) => void;
  removePainPoint: (id: number) => void;
  updatePainPoint: (id: number, updates: Partial<Omit<PainPoint, 'id'>>) => void;
  handleSave: () => void;
}

/**
 * Gerencia estado do editor de brief com 12 seções.
 * Seções 10–12 são específicas do Método Estado da Arte (Aguiari).
 */
export function useBriefEditor(initialData?: Partial<BriefData>): UseBriefEditorReturn {
  const [activeSection, setActiveSection] = useState(1);
  const [briefData, setBriefData] = useState<BriefData>({
    ...DEFAULT_BRIEF_DATA,
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentSectionData = useMemo(
    () => BRIEF_SECTIONS.find((s) => s.id === activeSection),
    [activeSection]
  );

  const completedSections = useMemo(
    () => BRIEF_SECTIONS.filter((_, index) => index < activeSection - 1).length,
    [activeSection]
  );

  const progressPercent = useMemo(
    () => Math.round((completedSections / BRIEF_SECTIONS.length) * 100),
    [completedSections]
  );

  const canGoPrev = activeSection > 1;
  const canGoNext = activeSection < BRIEF_SECTIONS.length;
  const isLastSection = activeSection === BRIEF_SECTIONS.length;

  const goToNextSection = useCallback(() => {
    if (canGoNext) setActiveSection((prev) => prev + 1);
  }, [canGoNext]);

  const goToPrevSection = useCallback(() => {
    if (canGoPrev) setActiveSection((prev) => prev - 1);
  }, [canGoPrev]);

  const handleInputChange = useCallback((key: keyof BriefData, value: unknown) => {
    setBriefData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addPainPoint = useCallback((text = '', intensity = 5) => {
    setBriefData((prev) => ({
      ...prev,
      painPoints: [
        ...prev.painPoints,
        {
          id: Math.max(0, ...prev.painPoints.map((p) => p.id)) + 1,
          text,
          intensity,
        },
      ],
    }));
  }, []);

  const removePainPoint = useCallback((id: number) => {
    setBriefData((prev) => ({
      ...prev,
      painPoints: prev.painPoints.filter((p) => p.id !== id),
    }));
  }, []);

  const updatePainPoint = useCallback(
    (id: number, updates: Partial<Omit<PainPoint, 'id'>>) => {
      setBriefData((prev) => ({
        ...prev,
        painPoints: prev.painPoints.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    },
    []
  );

  const handleSave = useCallback(() => {
    setIsSaving(true);
    // TODO: persistir no Supabase via PATCH /api/courses/[id]
    setTimeout(() => setIsSaving(false), 1000);
  }, []);

  return {
    activeSection,
    setActiveSection,
    briefData,
    setBriefData,
    isSaving,
    currentSectionData,
    progressPercent,
    totalSections: BRIEF_SECTIONS.length,
    sections: BRIEF_SECTIONS,
    canGoNext,
    canGoPrev,
    isLastSection,
    goToNextSection,
    goToPrevSection,
    handleInputChange,
    addPainPoint,
    removePainPoint,
    updatePainPoint,
    handleSave,
  };
}
