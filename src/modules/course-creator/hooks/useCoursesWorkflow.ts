import { useState, useCallback } from 'react';
import type { ViewState, Course } from '../types';

interface UseCoursesWorkflowReturn {
  view: ViewState;
  setView: (view: ViewState) => void;
  selectedCourseSlug: string | null;
  setSelectedCourseSlug: (slug: string | null) => void;
  selectedCourse: Course | undefined;
  goBack: () => void;
  goToBrief: () => void;
  startResearch: () => void;
  goToReformulation: () => void;
  goToCurriculum: () => void;
  startGeneration: () => void;
  goToLesson: () => void;
  goToValidation: () => void;
}

/**
 * Gerencia navegação entre etapas do fluxo de criação de curso.
 * As transições simuladas (research_loading → research_results, generation → lesson)
 * serão substituídas por chamadas reais de API quando o backend estiver pronto.
 */
export function useCoursesWorkflow(courses: Course[]): UseCoursesWorkflowReturn {
  const [view, setView] = useState<ViewState>('list');
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.slug === selectedCourseSlug);

  const goBack = useCallback(() => {
    setView('list');
    setSelectedCourseSlug(null);
  }, []);

  const goToBrief = useCallback(() => {
    setView('brief');
  }, []);

  const startResearch = useCallback(() => {
    setView('research_loading');
    // TODO: substituir por chamada real de pesquisa com IA
    setTimeout(() => setView('research_results'), 3500);
  }, []);

  const goToReformulation = useCallback(() => {
    setView('reformulation');
  }, []);

  const goToCurriculum = useCallback(() => {
    setView('curriculum');
  }, []);

  const startGeneration = useCallback(() => {
    setView('generation');
    // TODO: substituir por chamada real de geração de conteúdo com IA
    setTimeout(() => setView('lesson'), 5000);
  }, []);

  const goToLesson = useCallback(() => {
    setView('lesson');
  }, []);

  const goToValidation = useCallback(() => {
    setView('validation');
  }, []);

  return {
    view,
    setView,
    selectedCourseSlug,
    setSelectedCourseSlug,
    selectedCourse,
    goBack,
    goToBrief,
    startResearch,
    goToReformulation,
    goToCurriculum,
    startGeneration,
    goToLesson,
    goToValidation,
  };
}
