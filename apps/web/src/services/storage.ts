import localforage from 'localforage';
// import { Project } from '../types/layers'; // REMOVED

const PROJECT_KEY = (id: string) => `closset:project:${id}`;
const ASSET_KEY = (id: string) => `closset:asset:${id}`;

export const storage = {
  async saveProject(id: string, project: Project): Promise<void> {
    await localforage.setItem(PROJECT_KEY(id), project);
  },
  async loadProject(id: string): Promise<Project | null> {
    const p = await localforage.getItem<Project>(PROJECT_KEY(id));
    return p || null;
  },
  async saveAsset(id: string, blob: Blob): Promise<void> {
    await localforage.setItem(ASSET_KEY(id), blob);
  },
  async loadAsset(id: string): Promise<Blob | null> {
    const b = await localforage.getItem<Blob>(ASSET_KEY(id));
    return b || null;
  },
  async removeProject(id: string): Promise<void> {
    await localforage.removeItem(PROJECT_KEY(id));
  },
};
