import type { Course, CoursePipeline, CourseStatus } from '../types';

/**
 * Formato raw vindo da API (Supabase user_course_drafts)
 */
export interface RawCourseDraft {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  mode: 'greenfield' | 'brownfield';
  status: CourseStatus;
  brief_data: Record<string, unknown>;
  curriculum_data: Record<string, unknown>;
  script_data: Record<string, unknown>;
  validation_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const statusToPipeline = (status: CourseStatus): CoursePipeline => {
  const pipelines: Record<CourseStatus, CoursePipeline> = {
    planning: {
      brief: 'current',
      research: 'pending',
      curriculum: 'pending',
      lessons: 'pending',
      validation: 'pending',
    },
    brief: {
      brief: 'current',
      research: 'pending',
      curriculum: 'pending',
      lessons: 'pending',
      validation: 'pending',
    },
    research: {
      brief: 'completed',
      research: 'current',
      curriculum: 'pending',
      lessons: 'pending',
      validation: 'pending',
    },
    curriculum: {
      brief: 'completed',
      research: 'completed',
      curriculum: 'current',
      lessons: 'pending',
      validation: 'pending',
    },
    script_design: {
      brief: 'completed',
      research: 'completed',
      curriculum: 'completed',
      lessons: 'current',
      validation: 'pending',
    },
    generation: {
      brief: 'completed',
      research: 'completed',
      curriculum: 'completed',
      lessons: 'current',
      validation: 'pending',
    },
    validation: {
      brief: 'completed',
      research: 'completed',
      curriculum: 'completed',
      lessons: 'completed',
      validation: 'current',
    },
    published: {
      brief: 'completed',
      research: 'completed',
      curriculum: 'completed',
      lessons: 'completed',
      validation: 'completed',
    },
  };
  return pipelines[status] ?? pipelines.planning;
};

const getStatusLabel = (status: CourseStatus): string => {
  const labels: Record<CourseStatus, string> = {
    planning: 'Planejamento',
    brief: 'Brief',
    research: 'Pesquisa',
    curriculum: 'Currículo',
    script_design: 'Roteiro',
    generation: 'Produzindo',
    validation: 'Validação',
    published: 'Completo',
  };
  return labels[status] ?? 'Em Progresso';
};

const getProgressFromStatus = (status: CourseStatus): number => {
  const progress: Record<CourseStatus, number> = {
    planning: 5,
    brief: 15,
    research: 30,
    curriculum: 45,
    script_design: 60,
    generation: 75,
    validation: 90,
    published: 100,
  };
  return progress[status] ?? 0;
};

/**
 * Mapeia um draft cru do Supabase para o formato Course usado nos componentes
 */
export const mapDraftToCourse = (draft: RawCourseDraft): Course => {
  const briefData = draft.brief_data as Record<string, unknown>;
  const curriculumData = draft.curriculum_data as Record<string, unknown>;

  const modulesCount = Array.isArray(curriculumData?.modules)
    ? (curriculumData.modules as unknown[]).length
    : 0;

  const lessonsCount = Array.isArray(curriculumData?.modules)
    ? (curriculumData.modules as Array<{ lessons?: unknown[] }>).reduce(
        (acc, mod) => acc + (mod.lessons?.length ?? 0),
        0
      )
    : 0;

  return {
    id: draft.id,
    title: draft.title,
    slug: draft.slug,
    icon: 'book',
    category: String(briefData?.category ?? 'Geral'),
    instructor: {
      name: 'Você',
      avatar: '',
      isMMOS: false,
    },
    lessonsCount,
    modulesCount,
    researchCount: 0,
    assessmentsCount: 0,
    duration: String(briefData?.duration ?? '—'),
    type: draft.mode === 'brownfield' ? 'Brownfield' : 'Greenfield',
    mode: draft.mode,
    frameworks: ['Método Estado da Arte'],
    fidelityScore: null,
    statusLabel: getStatusLabel(draft.status),
    status: draft.status,
    progress: getProgressFromStatus(draft.status),
    updatedAt: new Date(draft.updated_at).toLocaleDateString('pt-BR'),
    pipeline: statusToPipeline(draft.status),
  };
};
