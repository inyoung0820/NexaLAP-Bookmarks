import * as vscode from 'vscode';
import { NexaBookmarkStore } from './nexa-bookmark-store';
import {
  Bookmark,
  isMonacoBookmark,
  isReactWidgetBookmark,
  bookmarkToLocation
} from './nexa-types';
import { NexaBookmarkTreeItem, NexaBookmarkTreeProvider } from './nexa-bookmark-tree';

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
  const store = new NexaBookmarkStore();

  const tree = new NexaBookmarkTreeProvider(() => store.getAll());
  const treeView = vscode.window.createTreeView('nexalapBookmarks.bookmarksView', {
    treeDataProvider: tree,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);

  const getSelectedBookmark = (): Bookmark | undefined => {
    const sel = treeView.selection?.[0];
    return sel instanceof NexaBookmarkTreeItem ? sel.bookmark : undefined;
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      tree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      tree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nexalapBookmarks.addBookmark', async () => {
      const editor = vscode.window.activeTextEditor;

      // 1) Text editor (Monaco) bookmark
      if (editor) {
        const bm: Bookmark = {
          kind: 'Text',
          id: makeId(),
          uri: editor.document.uri.toString(),
          line: editor.selection.active.line,
          character: editor.selection.active.character,
          label: makeLabel(editor),
          createdAt: Date.now()
        };

        const workspaceUri =
          vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri;
        await store.add(bm, workspaceUri);
        tree.refresh();
        return;
      }

      // 2) UI widget bookmark (ReactWidget) - try to get active widget info from host
      type UiWidgetInfo = { uri: string; scrollPos: number; label?: string };
      let info: UiWidgetInfo | undefined;
      try {
        info = (await vscode.commands.executeCommand(
          'nexalapStudio.getActiveWidgetInfo'
        )) as UiWidgetInfo | undefined;
      } catch {
        // ignore
      }

      const uri =
        info?.uri ??
        (await vscode.window.showInputBox({
          title: 'Add UI bookmark',
          prompt: 'Widget uri (host-specific identifier)',
          placeHolder: 'nexalap://widget/...'
        }));
      if (!uri) return;

      const label =
        info?.label ??
        (await vscode.window.showInputBox({
          title: 'Add UI bookmark',
          prompt: 'Label shown in the bookmarks view',
          value: uri
        }));
      if (!label) return;

      let scrollPos = info?.scrollPos;
      if (scrollPos == null) {
        const raw = await vscode.window.showInputBox({
          title: 'Add UI bookmark',
          prompt: 'Numeric scroll position',
          value: '0'
        });
        if (raw == null) return;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          vscode.window.showInformationMessage('scrollPos must be a number.');
          return;
        }
        scrollPos = parsed;
      }

      const bm: Bookmark = {
        kind: 'UI',
        id: makeId(),
        uri,
        scrollPos,
        label,
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
        if (isMonacoBookmark(bm)) {
          const loc = bookmarkToLocation(bm);
          const doc = await vscode.workspace.openTextDocument(loc.uri);
          const editor = await vscode.window.showTextDocument(doc, {
            preview: false
          });
          editor.selection = new vscode.Selection(
            loc.range.start,
            loc.range.start
          );
          editor.revealRange(loc.range, vscode.TextEditorRevealType.InCenter);
          return;
        }

        if (isReactWidgetBookmark(bm)) {
          // NexaLAP Studio(Theia) side should implement this command to open a ReactWidget by uri.
          // If not available, we show a message.
          try {
            await vscode.commands.executeCommand('nexalapStudio.openWidget', {
              uri: bm.uri,
              scrollPos: bm.scrollPos
            });
          } catch {
            vscode.window.showInformationMessage(
              'This bookmark targets a custom widget. Host command `nexalapStudio.openWidget` is not available.'
            );
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nexalapBookmarks.removeBookmark',
      async (bm?: Bookmark) => {
        const target = bm ?? getSelectedBookmark();
        if (!target) return;
        const workspaceUri =
          vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(target.uri))?.uri;
        await store.removeById(target.id, workspaceUri);
        tree.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nexalapBookmarks.editBookmark',
      async (bm?: Bookmark) => {
        const target = bm ?? getSelectedBookmark();
        if (!target) return;

        const newLabel = await vscode.window.showInputBox({
          title: 'Edit bookmark label',
          value: target.label,
          prompt: 'Label shown in the bookmarks view'
        });
        if (newLabel == null) return;

        if (isReactWidgetBookmark(target)) {
          const raw = await vscode.window.showInputBox({
            title: 'Edit UI scroll position',
            value: String(target.scrollPos),
            prompt: 'Numeric scroll position (e.g. 0, 1200)'
          });
          if (raw == null) return;
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            vscode.window.showInformationMessage('scrollPos must be a number.');
            return;
          }
          const workspaceUri =
            vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(target.uri))?.uri;
          await store.update(
            { id: target.id, label: newLabel, scrollPos: parsed },
            workspaceUri
          );
          tree.refresh();
          return;
        }

        const workspaceUri =
          vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(target.uri))?.uri;
        await store.update({ id: target.id, label: newLabel }, workspaceUri);
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

