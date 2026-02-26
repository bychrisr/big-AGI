import * as path from 'node:path';
import * as fs from 'node:fs';

import { createSupabaseServerClient } from '~/common/supabase/server';


export interface OnboardingAnswers {
  display_name: string;
  work_area: string;
  interests: string[];
  inspirations: string[];
  current_challenge: string;
  ai_experience: string;
  public_profiles?: string[];
}

interface CloneLayer {
  layer: string;
  name: string;
  fidelity: number;
  source: string;
  data: Record<string, unknown>;
}

const LAYER_WEIGHTS: Record<string, number> = {
  L1: 0.10, L2: 0.15, L3: 0.10, L4: 0.15,
  L5: 0.20, L6: 0.10, L7: 0.10, L8: 0.10,
};


function buildLayers(answers: OnboardingAnswers): CloneLayer[] {
  return [
    {
      layer: 'L1',
      name: 'identidade',
      fidelity: answers.display_name ? 0.5 : 0,
      source: 'onboarding',
      data: { display_name: answers.display_name, work_area: answers.work_area },
    },
    {
      layer: 'L5',
      name: 'interesses_e_foco',
      fidelity: answers.interests.length > 0 ? 0.6 : 0,
      source: 'onboarding',
      data: {
        primary_interests: answers.interests,
        inspirations: answers.inspirations,
        current_challenge: answers.current_challenge,
      },
    },
    {
      layer: 'L6',
      name: 'valores',
      fidelity: answers.inspirations.length > 0 ? 0.3 : 0,
      source: 'onboarding',
      data: { inferred_from_inspirations: answers.inspirations },
    },
    {
      layer: 'L8',
      name: 'meta',
      fidelity: 0.4,
      source: 'onboarding',
      data: {
        ai_experience: answers.ai_experience,
        public_profiles: answers.public_profiles ?? [],
      },
    },
  ];
}


function calcTotalFidelity(layers: CloneLayer[]): number {
  return layers.reduce((sum, l) => sum + (l.fidelity * (LAYER_WEIGHTS[l.layer] ?? 0)), 0);
}


export async function bootstrapClone(
  userId: string,
  username: string,
  answers: OnboardingAnswers,
): Promise<{ fidelity: number }> {
  const supabase = await createSupabaseServerClient();

  const layers = buildLayers(answers);
  const totalFidelity = calcTotalFidelity(layers);
  const now = new Date().toISOString();

  const layersJsonb: Record<string, unknown> = {};
  for (const l of layers) {
    layersJsonb[l.layer] = { name: l.name, fidelity: l.fidelity, source: l.source, data: l.data };
  }

  const milestone = 'Clone mínimo — pode auxiliar na geração de conteúdo simples';

  const { error } = await supabase.from('user_clone').upsert({
    user_id: userId,
    version: 'v0.1-bootstrap',
    fidelity: totalFidelity,
    layers: {
      ...layersJsonb,
      METADATA: {
        username,
        sources: [{ type: 'onboarding', date: now.split('T')[0], contribution: totalFidelity }],
        milestones: { next: 0.40, next_label: milestone },
        created_at: now,
        updated_at: now,
      },
    },
    milestone,
  }, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to upsert user_clone for ${userId}: ${error.message}`);

  const repoPath = process.env['TEAMAI_REPO_PATH'];
  if (repoPath) {
    writeCloneFiles(repoPath, username, layers, totalFidelity);
  }

  return { fidelity: totalFidelity };
}


function writeCloneFiles(
  repoPath: string,
  username: string,
  layers: CloneLayer[],
  fidelity: number,
): void {
  const cloneDir = path.join(repoPath, 'users', username, 'clone');
  const layersDir = path.join(cloneDir, 'layers');

  fs.mkdirSync(layersDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const cloneYaml = [
    `user: ${username}`,
    `version: "v0.1-bootstrap"`,
    `fidelity: ${fidelity.toFixed(2)}`,
    `sources:`,
    `  - type: onboarding`,
    `    date: "${today}"`,
    `    contribution: ${fidelity.toFixed(2)}`,
    `created_at: "${now}"`,
    `updated_at: "${now}"`,
    `milestones:`,
    `  next: 0.40`,
    `  next_label: "Clone mínimo — pode auxiliar na geração de conteúdo simples"`,
  ].join('\n');

  fs.writeFileSync(path.join(cloneDir, 'clone.yaml'), cloneYaml);

  for (const layer of layers) {
    const layerYaml = [
      `layer: ${layer.layer}`,
      `name: ${layer.name}`,
      `fidelity: ${layer.fidelity.toFixed(2)}`,
      `source: ${layer.source}`,
      `data:`,
      ...Object.entries(layer.data).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`),
    ].join('\n');

    fs.writeFileSync(path.join(layersDir, `${layer.layer}_${layer.name}.yaml`), layerYaml);
  }
}
