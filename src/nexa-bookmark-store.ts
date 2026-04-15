import * as vscode from 'vscode';
import { Bookmark } from './nexa-types';

type BookmarkFile = {
  version: 1;
  items: Bookmark[];
};

export class NexaBookmarkStore {
  private readonly relativeDir = '.settings';
  private readonly fileName = 'bookmarks.json';

  async getAll(workspaceUri?: vscode.Uri): Promise<Bookmark[]> {
    const fileUri = this.getBookmarkFileUri(workspaceUri);
    if (!fileUri) return [];

    const normalize = (raw: any): Bookmark | undefined => {
      if (!raw || typeof raw !== 'object') return undefined;
      const id = typeof raw.id === 'string' ? raw.id : undefined;
      const uri = typeof raw.uri === 'string' ? raw.uri : undefined;
      const label = typeof raw.label === 'string' ? raw.label : undefined;
      const createdAt =
        typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
      if (!id || !uri || !label) return undefined;

      const kind = raw.kind;
      if (
        kind === 'Text' ||
        kind === 'text editor' ||
        kind === 'monaco' ||
        (kind == null && raw.line != null)
      ) {
        const line = typeof raw.line === 'number' ? raw.line : undefined;
        const character =
          typeof raw.character === 'number' ? raw.character : undefined;
        if (line == null || character == null) return undefined;
        return {
          kind: 'Text',
          id,
          uri,
          line,
          character,
          label,
          createdAt
        };
      }

      if (
        kind === 'UI' ||
        kind === 'ui editor' ||
        kind === 'reactWidget' ||
        (kind == null && raw.scrollPos != null)
      ) {
        const scrollPos =
          typeof raw.scrollPos === 'number' ? raw.scrollPos : undefined;
        if (scrollPos == null) return undefined;
        return { kind: 'UI', id, uri, scrollPos, label, createdAt };
      }

      return undefined;
    };

    try {
      const bytes = await vscode.workspace.fs.readFile(fileUri);
      const text = new TextDecoder('utf-8').decode(bytes);
      const parsed = JSON.parse(text) as Partial<BookmarkFile>;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
        return (parsed.items as any[])
          .map(normalize)
          .filter((x): x is Bookmark => Boolean(x));
      }
      if (Array.isArray((parsed as any)?.items)) {
        return ((parsed as any).items as any[])
          .map(normalize)
          .filter((x: any): x is Bookmark => Boolean(x));
      }
      return [];
    } catch (e: any) {
      // If the file doesn't exist yet, treat as empty.
      if (e?.code === 'FileNotFound' || e?.code === 'ENOENT') return [];
      return [];
    }
  }

  async setAll(items: Bookmark[], workspaceUri?: vscode.Uri): Promise<void> {
    const fileUri = this.getBookmarkFileUri(workspaceUri);
    if (!fileUri) return;

    const targetDir = this.getBookmarkDirUri(workspaceUri);
    if (!targetDir) return;
    await vscode.workspace.fs.createDirectory(targetDir);

    const payload: BookmarkFile = { version: 1, items };
    const json = JSON.stringify(payload, null, 2);
    const bytes = new TextEncoder().encode(json);
    await vscode.workspace.fs.writeFile(fileUri, bytes);
  }

  async add(item: Bookmark, workspaceUri?: vscode.Uri): Promise<void> {
    const items = await this.getAll(workspaceUri);
    await this.setAll([item, ...items], workspaceUri);
  }

  async update(
    patch: Pick<Bookmark, 'id'> & Partial<Bookmark>,
    workspaceUri?: vscode.Uri
  ): Promise<void> {
    const items = await this.getAll(workspaceUri);
    const next = items.map((x) =>
      x.id === patch.id ? ({ ...x, ...patch } as Bookmark) : x
    );
    await this.setAll(next, workspaceUri);
  }

  async removeById(id: string, workspaceUri?: vscode.Uri): Promise<void> {
    const items = (await this.getAll(workspaceUri)).filter((x) => x.id !== id);
    await this.setAll(items, workspaceUri);
  }

  async clear(workspaceUri?: vscode.Uri): Promise<void> {
    await this.setAll([], workspaceUri);
  }

  /**
   * If workspaceUri is provided, use that folder. Otherwise, use the active editor's
   * workspace folder; if none, fall back to first workspace folder.
   */
  resolveWorkspaceUri(workspaceUri?: vscode.Uri): vscode.Uri | undefined {
    if (workspaceUri) return workspaceUri;

    const active = vscode.window.activeTextEditor?.document?.uri;
    if (active) {
      const wf = vscode.workspace.getWorkspaceFolder(active);
      if (wf) return wf.uri;
    }

    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  private getBookmarkDirUri(workspaceUri?: vscode.Uri): vscode.Uri | undefined {
    const base = this.resolveWorkspaceUri(workspaceUri);
    if (!base) return undefined;
    return vscode.Uri.joinPath(base, this.relativeDir);
  }

  private getBookmarkFileUri(workspaceUri?: vscode.Uri): vscode.Uri | undefined {
    const dir = this.getBookmarkDirUri(workspaceUri);
    if (!dir) return undefined;
    return vscode.Uri.joinPath(dir, this.fileName);
  }
}

