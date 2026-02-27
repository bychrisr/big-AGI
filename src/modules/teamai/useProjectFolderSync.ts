'use client';

import * as React from 'react';

import { useFolderStore } from '~/common/stores/folders/store-chat-folders';


/**
 * Syncs Supabase user_projects → local DFolders.
 * On first load (after auth is available), fetches /api/projects and creates
 * a DFolder for any project that doesn't already have a matching folder by name.
 */
export function useProjectFolderSync() {
  const synced = React.useRef(false);

  React.useEffect(() => {
    if (synced.current) return;

    void (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) return; // not authenticated or network error

        const json = await res.json() as { projects?: Array<{ project_name: string }> };
        const projects = json.projects ?? [];
        if (!projects.length) return;

        const { folders, createFolder } = useFolderStore.getState();
        const existingTitles = new Set(folders.map(f => f.title.toLowerCase()));

        for (const project of projects) {
          const name = project.project_name;
          if (!existingTitles.has(name.toLowerCase())) {
            createFolder(name);
          }
        }

        synced.current = true;
      } catch {
        // silent — not logged in or no network
      }
    })();
  }, []);
}
