'use client';

import * as React from 'react';

import { useFolderStore } from '~/common/stores/folders/store-chat-folders';


/**
 * Bidirectional sync: Supabase user_projects ↔ local Zustand folders.
 *
 * Rules:
 * - Create local folder for each Supabase project that has no matching local folder.
 * - Delete empty local folders whose name does NOT match any Supabase project
 *   (stale artifacts from deleted or renamed projects).
 * - Never delete folders that contain conversations.
 */
export function useProjectFolderSync() {
  const synced = React.useRef(false);

  React.useEffect(() => {
    if (synced.current) return;

    void (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) return;

        const json = await res.json() as { projects?: Array<{ project_name: string }> };
        const supabaseProjects = json.projects ?? [];
        const supabaseNames = new Set(supabaseProjects.map(p => p.project_name.toLowerCase()));

        const { folders, createFolder, deleteFolder } = useFolderStore.getState();

        // 1. Remove empty local folders not backed by Supabase
        for (const folder of folders) {
          const hasChats = folder.conversationIds.length > 0;
          const inSupabase = supabaseNames.has(folder.title.toLowerCase());
          if (!hasChats && !inSupabase) {
            deleteFolder(folder.id);
          }
        }

        // 2. Create missing folders for Supabase projects
        const currentTitles = new Set(
          useFolderStore.getState().folders.map(f => f.title.toLowerCase())
        );
        for (const project of supabaseProjects) {
          if (!currentTitles.has(project.project_name.toLowerCase())) {
            createFolder(project.project_name);
          }
        }

        synced.current = true;
      } catch {
        // silent — not logged in or no network
      }
    })();
  }, []);
}
