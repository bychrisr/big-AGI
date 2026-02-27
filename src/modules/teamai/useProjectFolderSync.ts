'use client';

import * as React from 'react';

import { useFolderStore } from '~/common/stores/folders/store-chat-folders';


// localStorage key tracking which folder names were created by Supabase sync.
// Used to identify stale folders when a project is deleted from Supabase.
const SYNC_REGISTRY_KEY = 'teamai:synced-project-folders';

function getSyncedNames(): Set<string> {
  try {
    const raw = localStorage.getItem(SYNC_REGISTRY_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSyncedNames(names: Set<string>): void {
  try {
    localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify([...names]));
  } catch { /* silent */ }
}


/**
 * Bidirectional sync: Supabase user_projects ↔ local DFolders.
 * - Creates local folders for new Supabase projects.
 * - Removes local folders whose project was deleted from Supabase
 *   (only if the folder has no conversations and was created by sync).
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
        const syncedNames = getSyncedNames();

        // 1. Remove stale folders: was synced from Supabase, no longer in Supabase, has no chats
        for (const folder of folders) {
          const lowerTitle = folder.title.toLowerCase();
          if (
            syncedNames.has(lowerTitle) &&
            !supabaseNames.has(lowerTitle) &&
            folder.conversationIds.length === 0
          ) {
            deleteFolder(folder.id);
            syncedNames.delete(lowerTitle);
          }
        }

        // 2. Create missing folders for new Supabase projects
        const existingTitles = new Set(
          useFolderStore.getState().folders.map(f => f.title.toLowerCase())
        );
        for (const project of supabaseProjects) {
          const lowerName = project.project_name.toLowerCase();
          if (!existingTitles.has(lowerName)) {
            createFolder(project.project_name);
          }
          syncedNames.add(lowerName);
        }

        saveSyncedNames(syncedNames);
        synced.current = true;
      } catch {
        // silent — not logged in or no network
      }
    })();
  }, []);
}
