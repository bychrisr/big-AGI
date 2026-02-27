'use client';

/**
 * Hook that checks cross-project similarity when a new message is sent.
 * Calls /api/projects, calculates keyword similarity, returns insight
 * if confidence > 0.7.
 */
import * as React from 'react';


interface ProjectData {
  project_name: string;
  claude_md?: string | null;
  patterns?: string[] | null;
}

export interface CrossProjectInsight {
  sourceProject: string;
  decision: string;
  confidence: number;
}

interface CrossProjectContextResult {
  insight: CrossProjectInsight | null;
  isChecking: boolean;
  dismiss: () => void;
  checkMessage: (message: string) => void;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this',
  'are', 'was', 'has', 'not', 'but', 'can', 'use', 'get',
  'uma', 'para', 'com', 'que', 'por', 'mais', 'como',
  'ser', 'ter', 'foi', 'nos', 'das', 'dos', 'seu', 'sua',
]);

function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().match(/\w{3,}/g) ?? [];
  return new Set(words.filter(w => !STOPWORDS.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return Math.min(1.0, (intersection / union) * 1.2);
}


export function useCrossProjectContext(
  projectName: string | null,
): CrossProjectContextResult {
  const [insight, setInsight] = React.useState<CrossProjectInsight | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const notifiedRef = React.useRef<Set<string>>(new Set());

  const dismiss = React.useCallback(() => {
    setInsight(null);
  }, []);

  const checkMessage = React.useCallback(async (message: string) => {
    if (!projectName || !message.trim()) return;

    setIsChecking(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;

      const json = await res.json() as { projects?: ProjectData[] };
      const projects = json.projects ?? [];
      const messageKeywords = extractKeywords(message);
      if (messageKeywords.size === 0) return;

      let bestInsight: CrossProjectInsight | null = null;
      let bestConfidence = 0;

      for (const project of projects) {
        if (project.project_name.toLowerCase() === projectName.toLowerCase()) {
          continue;
        }

        const projectText = [
          project.project_name,
          project.claude_md ?? '',
          ...(project.patterns ?? []),
        ].join(' ');

        const projectKeywords = extractKeywords(projectText);
        const confidence = jaccardSimilarity(messageKeywords, projectKeywords);

        if (confidence > bestConfidence && confidence > 0.7) {
          bestConfidence = confidence;
          const decisionSnippet = (project.claude_md ?? project.project_name).slice(0, 120);
          bestInsight = {
            sourceProject: project.project_name,
            decision: decisionSnippet,
            confidence,
          };
        }
      }

      if (bestInsight) {
        const hash = `${bestInsight.sourceProject}:${bestInsight.decision}`;
        if (!notifiedRef.current.has(hash)) {
          notifiedRef.current.add(hash);
          setInsight(bestInsight);
        }
      }
    } catch {
      // Silent — never block the chat
    } finally {
      setIsChecking(false);
    }
  }, [projectName]);

  return { insight, isChecking, dismiss, checkMessage };
}
