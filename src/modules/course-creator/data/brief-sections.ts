import type { BriefSection, PipelineStep, BriefData } from '../types';

/**
 * 12 seções do brief — 9 originais + 3 do Método Estado da Arte (Aguiari)
 */
export const BRIEF_SECTIONS: BriefSection[] = [
  {
    id: 1,
    key: 'dreamOutcome',
    title: 'Dream Outcome',
    description: 'Qual é a promessa principal do curso?',
    icon: 'star',
  },
  {
    id: 2,
    key: 'targetAudience',
    title: 'Público-Alvo (ICP)',
    description: 'Quem é o aluno ideal para este curso?',
    icon: 'users',
  },
  {
    id: 3,
    key: 'painPoints',
    title: 'Dores e Problemas',
    description: 'Quais problemas o curso resolve?',
    icon: 'heartbeat',
  },
  {
    id: 4,
    key: 'prerequisites',
    title: 'Pré-requisitos',
    description: 'O que o aluno precisa saber antes?',
    icon: 'list-check',
  },
  {
    id: 5,
    key: 'uniqueValue',
    title: 'Proposta de Valor Única',
    description: 'O que diferencia este curso?',
    icon: 'gem',
  },
  {
    id: 6,
    key: 'methodology',
    title: 'Metodologia',
    description: 'Como o conteúdo será ensinado?',
    icon: 'route',
  },
  {
    id: 7,
    key: 'expectedResults',
    title: 'Resultados Esperados',
    description: 'O que o aluno vai conseguir fazer?',
    icon: 'trophy',
  },
  {
    id: 8,
    key: 'duration',
    title: 'Duração e Formato',
    description: 'Estrutura geral do curso',
    icon: 'clock',
  },
  {
    id: 9,
    key: 'context',
    title: 'Contexto e Notas',
    description: 'Informações adicionais relevantes para a produção',
    icon: 'notes',
  },
  // Seções Método Estado da Arte (Aguiari)
  {
    id: 10,
    key: 'communicationProfile',
    title: 'Perfil de Comunicação',
    description: 'Tom dominante do curso: Direção, Intimidade, Inspiração, Mistério ou Confronto',
    icon: 'microphone',
  },
  {
    id: 11,
    key: 'narrativeGamification',
    title: 'Gamificação Narrativa',
    description: 'Como o arco narrativo mantém o aluno engajado até o fim',
    icon: 'game-controller',
  },
  {
    id: 12,
    key: 'consciousnessLine',
    title: 'Linha de Consciência',
    description: 'Jornada do aluno: da consciência do problema até a consciência do produto',
    icon: 'brain',
  },
];

export const DEFAULT_PIPELINE: PipelineStep[] = [
  { key: 'brief', label: 'Brief', status: 'current' },
  { key: 'research', label: 'Research', status: 'pending' },
  { key: 'curriculum', label: 'Currículo', status: 'pending' },
  { key: 'lessons', label: 'Lições', status: 'pending' },
  { key: 'validation', label: 'Validação', status: 'pending' },
];

export const DEFAULT_BRIEF_DATA: BriefData = {
  dreamOutcome: '',
  targetAudience: '',
  painPoints: [{ id: 1, text: '', intensity: 5 }],
  prerequisites: '',
  uniqueValue: '',
  methodology: '',
  expectedResults: '',
  duration: '',
  context: '',
  communicationProfile: undefined,
  narrativeGamification: undefined,
  consciousnessLine: undefined,
  threeEBalance: undefined,
};
