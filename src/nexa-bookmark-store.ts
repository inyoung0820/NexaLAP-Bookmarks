import * as vscode from 'vscode';
import { Bookmark } from './nexa-types';

const STORAGE_KEY = 'nexalapBookmarks.items';

export class NexaBookmarkStore {
  constructor(private readonly memento: vscode.Memento) {}

  getAll(): Bookmark[] {
    return this.memento.get<Bookmark[]>(STORAGE_KEY, []);
  }

  async setAll(items: Bookmark[]): Promise<void> {
    await this.memento.update(STORAGE_KEY, items);
  }

  async add(item: Bookmark): Promise<void> {
    const items = this.getAll();
    await this.setAll([item, ...items]);
  }

  async removeById(id: string): Promise<void> {
    const items = this.getAll().filter((x) => x.id !== id);
    await this.setAll(items);
  }

  async clear(): Promise<void> {
    await this.setAll([]);
  }
}

