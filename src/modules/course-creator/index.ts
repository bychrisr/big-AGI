// Types
export type {
  ViewState,
  ViewMode,
  CourseMode,
  CourseStatus,
  PipelineStepStatus,
  PipelineState,
  CoursePipeline,
  PipelineStep,
  LessonType,
  LessonStatus,
  ThreeEBalance,
  ConsciousnessPhase,
  CommunicationProfile,
  ScriptElementType,
  ScriptElementBlock,
  CourseInstructor,
  CourseAlert,
  Course,
  Lesson,
  Module,
  PainPoint,
  BriefData,
  BriefSection,
  CommunicationProfileConfig,
  NarrativeGamification,
  ConsciousnessLine,
  GenerationLogEntry,
  GenerationLogStatus,
  PipelineStageConfig,
  StatusIconInfo,
} from './types';

export {
  COURSE_STATUS_COLORS,
  PIPELINE_STATUS_COLORS,
  LESSON_TYPE_LABELS,
  THREE_E_DEFAULTS,
} from './types';

// Data
export {
  BRIEF_SECTIONS,
  DEFAULT_PIPELINE,
  DEFAULT_BRIEF_DATA,
  initialModules,
  defaultPipeline,
  mapDraftToCourse,
} from './data';
export type { RawCourseDraft } from './data';

// Hooks
export {
  useCoursesWorkflow,
  useCurriculumState,
  getStatusIcon,
  getTypeIcon,
  useBriefEditor,
  useCoursesData,
} from './hooks';
