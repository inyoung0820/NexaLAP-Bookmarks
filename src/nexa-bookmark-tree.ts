import * as vscode from 'vscode';
import { Bookmark, isMonacoBookmark } from './nexa-types';

export class NexaBookmarkTreeItem extends vscode.TreeItem {
  constructor(
    public readonly bookmark: Bookmark,
    public readonly command: vscode.Command
  ) {
    super(bookmark.label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'nexalapBookmarkItem';
    this.tooltip = isMonacoBookmark(bookmark)
      ? `${bookmark.label}\n${bookmark.uri}:${bookmark.line + 1}:${bookmark.character + 1}`
      : `${bookmark.label}\n${bookmark.uri} (scroll: ${bookmark.scrollPos})`;
    this.iconPath = new vscode.ThemeIcon('bookmark');
  }
}

class NexaActionTreeItem extends vscode.TreeItem {
  constructor(label: string, command: vscode.Command, iconId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = command;
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.contextValue = 'nexalapBookmarksAction';
  }
}

class NexaActionsGroupTreeItem extends vscode.TreeItem {
  constructor() {
    super('Actions', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'nexalapBookmarksActionsGroup';
    this.iconPath = new vscode.ThemeIcon('tools');
  }
}

export class NexaBookmarkTreeProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private getBookmarks: () => Thenable<Bookmark[]> | Bookmark[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element instanceof NexaActionsGroupTreeItem) {
      const addCmd: vscode.Command = {
        command: 'nexalapBookmarks.addBookmark',
        title: 'Add Bookmark'
      };
      const editCmd: vscode.Command = {
        command: 'nexalapBookmarks.editBookmark',
        title: 'Edit Bookmark'
      };
      const delCmd: vscode.Command = {
        command: 'nexalapBookmarks.removeBookmark',
        title: 'Delete Bookmark'
      };
      return Promise.resolve([
        new NexaActionTreeItem('Add', addCmd, 'add'),
        new NexaActionTreeItem('Edit selected', editCmd, 'edit'),
        new NexaActionTreeItem('Delete selected', delCmd, 'trash')
      ]);
    }

    if (!element) {
      return Promise.resolve(this.getBookmarks()).then((items) => {
        const bookmarks = items.map((bm) => {
          const command: vscode.Command = {
            command: 'nexalapBookmarks.openBookmark',
            title: 'Open Bookmark',
            arguments: [bm]
          };
          return new NexaBookmarkTreeItem(bm, command);
        });
        return [new NexaActionsGroupTreeItem(), ...bookmarks];
      });
    }

    return Promise.resolve([]);
  }
}

