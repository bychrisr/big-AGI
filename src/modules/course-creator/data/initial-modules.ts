import type { Module, PipelineStep } from '../types';

export const initialModules: Module[] = [
  {
    id: 1,
    title: 'Fundamentos e Visão',
    description: 'Construção de crença e contexto inicial.',
    isExpanded: true,
    lessons: [
      {
        id: '1.1',
        title: 'Introdução ao Curso',
        duration: '8 min',
        type: 'vision',
        status: 'draft',
        consciousness_phase: 'problem',
        communication_profile: 'inspiration',
        three_e_balance: { ensino: 20, exemplo: 60, experiencia: 20 },
      },
      {
        id: '1.2',
        title: 'O Que Você Vai Aprender',
        duration: '7 min',
        type: 'base',
        status: 'draft',
        consciousness_phase: 'problem',
        communication_profile: 'direction',
      },
    ],
  },
  {
    id: 2,
    title: 'Conceitos Base',
    description: 'Fundamentos essenciais para avançar.',
    isExpanded: true,
    lessons: [
      {
        id: '2.1',
        title: 'Conceito Central',
        duration: '10 min',
        type: 'base',
        status: 'draft',
        consciousness_phase: 'solution',
        communication_profile: 'direction',
        three_e_balance: { ensino: 50, exemplo: 30, experiencia: 20 },
      },
      {
        id: '2.2',
        title: 'Aplicação Prática',
        duration: '8 min',
        type: 'checklist',
        status: 'draft',
        consciousness_phase: 'solution',
        communication_profile: 'direction',
      },
    ],
  },
];

export const defaultPipeline: PipelineStep[] = [
  { key: 'brief', label: 'Brief', status: 'completed' },
  { key: 'research', label: 'Research', status: 'completed' },
  { key: 'curriculum', label: 'Currículo', status: 'current' },
  { key: 'lessons', label: 'Lições', status: 'pending' },
  { key: 'validation', label: 'Validação', status: 'pending' },
];
