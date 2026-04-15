import * as vscode from 'vscode';
import { Bookmark, bookmarkToLocation } from './nexa-types';

export class NexaBookmarkTreeItem extends vscode.TreeItem {
  constructor(
    public readonly bookmark: Bookmark,
    public readonly command: vscode.Command
  ) {
    super(bookmark.label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'nexalapBookmarkItem';
    this.tooltip = `${bookmark.label}\n${bookmark.uri}:${bookmark.line + 1}:${bookmark.character + 1}`;
    this.iconPath = new vscode.ThemeIcon('bookmark');
  }
}

export class NexaBookmarkTreeProvider
  implements vscode.TreeDataProvider<NexaBookmarkTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    NexaBookmarkTreeItem | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private getBookmarks: () => Bookmark[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: NexaBookmarkTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): NexaBookmarkTreeItem[] {
    const items = this.getBookmarks();
    return items.map((bm) => {
      const loc = bookmarkToLocation(bm);
      const command: vscode.Command = {
        command: 'nexalapBookmarks.openBookmark',
        title: 'Open Bookmark',
        arguments: [bm, loc]
      };
      return new NexaBookmarkTreeItem(bm, command);
    });
  }
}

