import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Course } from '../types';
import { mapDraftToCourse } from '../data';
import type { RawCourseDraft } from '../data';

interface UseCoursesDataReturn {
  courses: Course[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Busca os drafts de curso do usuário via GET /api/courses
 * e mapeia para o formato Course usado nos componentes.
 */
export function useCoursesData(): UseCoursesDataReturn {
  const [drafts, setDrafts] = useState<RawCourseDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchDrafts = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/courses');
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { data: RawCourseDraft[] };
        if (!cancelled) setDrafts(data.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDrafts().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const courses = useMemo(() => drafts.map(mapDraftToCourse), [drafts]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  return { courses, loading, error, refetch };
}
