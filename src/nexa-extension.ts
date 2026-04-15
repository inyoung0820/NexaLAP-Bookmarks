import * as vscode from 'vscode';
import { NexaBookmarkStore } from './nexa-bookmark-store';
import { Bookmark, bookmarkToLocation } from './nexa-types';
import { NexaBookmarkTreeProvider } from './nexa-bookmark-tree';

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLabel(editor: vscode.TextEditor): string {
  const { document, selection } = editor;
  const base = vscode.workspace.asRelativePath(document.uri, false);
  const lineNo = selection.active.line + 1;
  const text = document.lineAt(selection.active.line).text.trim();
  const suffix = text ? ` — ${text}` : '';
  return `${base}:${lineNo}${suffix}`;
}

export function activate(context: vscode.ExtensionContext) {
  const store = new NexaBookmarkStore(context.globalState);

  const tree = new NexaBookmarkTreeProvider(() => store.getAll());
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'nexalapBookmarks.bookmarksView',
      tree
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nexalapBookmarks.addBookmark', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor.');
        return;
      }

      const bm: Bookmark = {
        id: makeId(),
        uri: editor.document.uri.toString(),
        line: editor.selection.active.line,
        character: editor.selection.active.character,
        label: makeLabel(editor),
        createdAt: Date.now()
      };

      await store.add(bm);
      tree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nexalapBookmarks.openBookmark',
      async (bm?: Bookmark) => {
        if (!bm) {
          vscode.window.showInformationMessage('No bookmark selected.');
          return;
        }
        const loc = bookmarkToLocation(bm);
        const doc = await vscode.workspace.openTextDocument(loc.uri);
        const editor = await vscode.window.showTextDocument(doc, {
          preview: false
        });
        editor.selection = new vscode.Selection(loc.range.start, loc.range.start);
        editor.revealRange(loc.range, vscode.TextEditorRevealType.InCenter);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nexalapBookmarks.removeBookmark',
      async (bm?: Bookmark) => {
        if (!bm) {
          vscode.window.showInformationMessage(
            'Right-click a bookmark in the view to remove it.'
          );
          return;
        }
        await store.removeById(bm.id);
        tree.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nexalapBookmarks.clearBookmarks',
      async () => {
        await store.clear();
        tree.refresh();
      }
    )
  );
}

export function deactivate() {}

