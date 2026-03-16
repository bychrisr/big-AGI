/**
 * Course Creator — Types & Interfaces
 *
 * Adapted from os-lendario/components/creator with extensions
 * for the Método Estado da Arte (Leandro Aguiari).
 */

// =============================================================================
// VIEW & MODE STATES
// =============================================================================

export type ViewState =
  | 'list'
  | 'new'
  | 'brief'
  | 'research_loading'
  | 'research_results'
  | 'reformulation'
  | 'curriculum'
  | 'generation'
  | 'lesson'
  | 'validation';

export type ViewMode = 'list' | 'grid';
export type CourseMode = 'greenfield' | 'brownfield';

// =============================================================================
// PIPELINE STATE
// =============================================================================

export type PipelineStepStatus = 'completed' | 'current' | 'pending';

export interface PipelineState {
  brief: PipelineStepStatus;
  research: PipelineStepStatus;
  curriculum: PipelineStepStatus;
  lessons: PipelineStepStatus;
  validation: PipelineStepStatus;
}

// Alias para compatibilidade
export type CoursePipeline = PipelineState;

export interface PipelineStep {
  key: string;
  label: string;
  status: PipelineStepStatus;
}

// =============================================================================
// MÉTODO ESTADO DA ARTE (AGUIARI) — TIPOS ESPECÍFICOS
// =============================================================================

/**
 * Tipo de aula segundo o Método Estado da Arte
 * - vision: aula de visão (transformação de crença)
 * - complementary: aula complementar (conteúdo de apoio)
 * - checklist: aula de checklist (passo a passo prático)
 * - clarity: aula de clareza (simplificação de conceito)
 * - base: aula base (fundamentos essenciais)
 */
export type LessonType =
  | 'video'
  | 'text'
  | 'quiz'
  | 'practice'
  | 'vision'
  | 'complementary'
  | 'checklist'
  | 'clarity'
  | 'base';

/**
 * Equilíbrio dos 3Es — distribuição percentual entre os pilares didáticos
 * Ensino: transmissão direta de conhecimento
 * Exemplo: casos, histórias, analogias
 * Experiência: exercícios, aplicação prática
 */
export interface ThreeEBalance {
  ensino: number;
  exemplo: number;
  experiencia: number;
}

/**
 * Fase de consciência do aluno (framework de consciência do problema/solução/produto)
 */
export type ConsciousnessPhase = 'problem' | 'solution' | 'product';

/**
 * Perfil de comunicação da aula
 * - direction: foco em direção e clareza de destino
 * - intimacy: conexão emocional e vulnerabilidade
 * - inspiration: motivação e expansão de crença
 * - mystery: curiosidade e suspense cognitivo
 * - confrontation: provocação e quebra de padrão
 */
export type CommunicationProfile =
  | 'direction'
  | 'intimacy'
  | 'inspiration'
  | 'mystery'
  | 'confrontation';

/**
 * Elemento de roteiro — bloco atômico de construção de aula
 * 11 elementos do sistema de roteiro do Método Estado da Arte
 */
export type ScriptElementType =
  | 'hook'
  | 'context'
  | 'problem'
  | 'story'
  | 'concept'
  | 'example'
  | 'exercise'
  | 'objection'
  | 'summary'
  | 'call_to_action'
  | 'bridge';

export interface ScriptElementBlock {
  type: ScriptElementType;
  content: string;
  duration_seconds?: number | undefined;
}

// =============================================================================
// COURSE TYPES
// =============================================================================

export type CourseStatus =
  | 'planning'
  | 'brief'
  | 'research'
  | 'curriculum'
  | 'script_design'
  | 'generation'
  | 'validation'
  | 'published';

export interface CourseInstructor {
  name: string;
  avatar: string;
  isMMOS: boolean;
}

export interface CourseAlert {
  type: 'warning' | 'error';
  message: string;
}

export interface Course {
  id: string | number;
  title: string;
  slug: string;
  icon: string;
  category: string;
  instructor: CourseInstructor;
  lessonsCount: number;
  modulesCount: number;
  researchCount: number;
  assessmentsCount: number;
  duration: string;
  type: 'Greenfield' | 'Brownfield';
  mode: CourseMode;
  frameworks: string[];
  fidelityScore: number | null;
  statusLabel: string;
  status: CourseStatus;
  progress: number;
  updatedAt: string;
  alerts?: CourseAlert[] | undefined;
  pipeline: PipelineState;
}

// =============================================================================
// CURRICULUM TYPES
// =============================================================================

export type LessonStatus = 'draft' | 'in_progress' | 'completed';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: LessonType;
  status: LessonStatus;
  // Método Estado da Arte — campos opcionais
  lesson_type?: LessonType | undefined;
  three_e_balance?: ThreeEBalance | undefined;
  consciousness_phase?: ConsciousnessPhase | undefined;
  communication_profile?: CommunicationProfile | undefined;
  script_elements?: ScriptElementBlock[] | undefined;
}

export interface Module {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
  isExpanded: boolean;
}

// =============================================================================
// BRIEF TYPES
// =============================================================================

export interface PainPoint {
  id: number;
  text: string;
  intensity: number;
}

/**
 * Perfil de comunicação do curso inteiro (seção do brief)
 */
export interface CommunicationProfileConfig {
  primary: CommunicationProfile;
  secondary?: CommunicationProfile | undefined;
  rationale: string;
}

/**
 * Gamificação narrativa — como o curso usa arcos de história para engajamento
 */
export interface NarrativeGamification {
  arc_type: 'hero_journey' | 'transformation' | 'mystery' | 'challenge';
  checkpoints: string[];
  rewards: string[];
}

/**
 * Linha de consciência — mapeamento da jornada do aluno pelas fases
 */
export interface ConsciousnessLine {
  start_phase: ConsciousnessPhase;
  end_phase: ConsciousnessPhase;
  transition_points: string[];
}

/**
 * Dados completos do brief — 12 seções (9 originais + 3 Método Estado da Arte)
 */
export interface BriefData {
  // Seções originais (1–9)
  dreamOutcome: string;
  targetAudience: string;
  painPoints: PainPoint[];
  prerequisites: string;
  uniqueValue: string;
  methodology: string;
  expectedResults: string;
  duration: string;
  // Seção 9 original: contexto/notas gerais
  context?: string | undefined;
  // Seções Método Estado da Arte (10–12)
  communicationProfile?: CommunicationProfileConfig | undefined;
  narrativeGamification?: NarrativeGamification | undefined;
  consciousnessLine?: ConsciousnessLine | undefined;
  threeEBalance?: ThreeEBalance | undefined;
}

export interface BriefSection {
  id: number;
  key: keyof BriefData;
  title: string;
  description: string;
  icon: string;
}

// =============================================================================
// GENERATION LOG TYPES
// =============================================================================

export type GenerationLogStatus = 'success' | 'retrying' | 'pending';

export interface GenerationLogEntry {
  id: string;
  title: string;
  gps: number;
  dl: number;
  status: GenerationLogStatus;
  msg: string;
}

// =============================================================================
// PIPELINE STAGE CONFIG
// =============================================================================

export interface PipelineStageConfig {
  id: string;
  label: string;
  icon: string;
  status: 'active' | 'done' | 'pending';
  count: number;
}

// =============================================================================
// STATUS ICON HELPER
// =============================================================================

export interface StatusIconInfo {
  icon: string;
  color: string;
}

// =============================================================================
// CONFIG CONSTANTS
// =============================================================================

export const COURSE_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Completo: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
  },
  Produzindo: {
    bg: 'bg-studio-primary/10',
    text: 'text-studio-primary',
    border: 'border-studio-primary/30',
  },
  Validação: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
  },
  Planejamento: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/30',
  },
  Brief: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-500/30',
  },
  Pesquisa: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600',
    border: 'border-indigo-500/30',
  },
};

export const PIPELINE_STATUS_COLORS: Record<PipelineStepStatus, string> = {
  completed: 'text-emerald-500',
  current: 'text-blue-500 animate-pulse',
  pending: 'text-muted-foreground',
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: 'Vídeo',
  text: 'Texto',
  quiz: 'Quiz',
  practice: 'Prática',
  vision: 'Visão',
  complementary: 'Complementar',
  checklist: 'Checklist',
  clarity: 'Clareza',
  base: 'Base',
};

export const THREE_E_DEFAULTS: ThreeEBalance = {
  ensino: 40,
  exemplo: 40,
  experiencia: 20,
};
