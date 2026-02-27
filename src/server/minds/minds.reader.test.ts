import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mergeMinds, readSharedMinds, readUserMinds } from './minds.reader';


// Cria estrutura de diretórios temporária para testes
function createTmpMindsDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teamai-test-'));

  // Estrutura: tmpDir/squads-base/mmos-squad/minds/
  const sharedMindsDir = path.join(tmpDir, 'squads-base', 'mmos-squad', 'minds');
  fs.mkdirSync(sharedMindsDir, { recursive: true });

  // Criar um mind shared
  const mindDir = path.join(sharedMindsDir, 'test_mind');
  fs.mkdirSync(path.join(mindDir, 'system_prompts'), { recursive: true });
  fs.writeFileSync(
    path.join(mindDir, 'metadata.yaml'),
    `id: test_mind\nname: "Test Mind"\nspecialty: "Testing"\ntoken_budget: 10000\ntags:\n  - test\n  - demo\nstatus: active\n`,
  );
  fs.writeFileSync(
    path.join(mindDir, 'system_prompts', 'main.md'),
    '# Test Mind\nVocê é especialista em testes.',
  );

  // Criar um mind custom para usuário
  const userMindsDir = path.join(tmpDir, 'users', 'test_user', 'minds');
  fs.mkdirSync(userMindsDir, { recursive: true });
  const customMindDir = path.join(userMindsDir, 'custom_mind');
  fs.mkdirSync(path.join(customMindDir, 'system_prompts'), { recursive: true });
  fs.writeFileSync(
    path.join(customMindDir, 'metadata.yaml'),
    `id: custom_mind\nname: "Custom Mind"\nspecialty: "Custom"\ntoken_budget: 5000\nstatus: active\n`,
  );

  return tmpDir;
}


describe('readSharedMinds', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpMindsDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('retorna minds do diretório compartilhado', () => {
    const minds = readSharedMinds(tmpDir);
    expect(minds).toHaveLength(1);
    expect(minds[0]).toMatchObject({
      id: 'test_mind',
      name: 'Test Mind',
      specialty: 'Testing',
      source: 'shared',
      tokenBudget: 10000,
    });
  });

  it('retorna array vazio se diretório não existe', () => {
    const minds = readSharedMinds('/nonexistent/path');
    expect(minds).toEqual([]);
  });

  it('inclui systemPromptPreview se system_prompt.md existe', () => {
    const minds = readSharedMinds(tmpDir);
    expect(minds[0]?.systemPromptPreview).toContain('Test Mind');
  });
});


describe('readUserMinds', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpMindsDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('retorna minds personalizados do usuário', () => {
    const minds = readUserMinds(tmpDir, 'test_user');
    expect(minds).toHaveLength(1);
    expect(minds[0]).toMatchObject({ id: 'custom_mind', source: 'custom' });
  });

  it('retorna vazio para usuário sem minds', () => {
    const minds = readUserMinds(tmpDir, 'nonexistent_user');
    expect(minds).toEqual([]);
  });
});


describe('mergeMinds', () => {
  it('combina shared e custom sem duplicatas', () => {
    const shared = [{ id: 'mind_a', name: 'A', specialty: 'S', tags: [], tokenBudget: 1000, source: 'shared' as const }];
    const custom = [{ id: 'mind_b', name: 'B', specialty: 'S', tags: [], tokenBudget: 1000, source: 'custom' as const }];
    const merged = mergeMinds(shared, custom);
    expect(merged).toHaveLength(2);
  });

  it('custom sobrescreve shared para mesmo id', () => {
    const shared = [{ id: 'mind_a', name: 'Shared A', specialty: 'S', tags: [], tokenBudget: 1000, source: 'shared' as const }];
    const custom = [{ id: 'mind_a', name: 'Custom A', specialty: 'S', tags: [], tokenBudget: 1000, source: 'custom' as const }];
    const merged = mergeMinds(shared, custom);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('Custom A');
    expect(merged[0]?.source).toBe('custom');
  });
});
