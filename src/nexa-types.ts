import * as vscode from 'vscode';

export type NexaMonacoBookmark = {
  kind: 'Text';
  id: string;
  uri: string;
  line: number;
  character: number;
  label: string;
  createdAt: number;
};

export type NexaReactWidgetBookmark = {
  kind: 'UI';
  id: string;
  uri: string;
  scrollPos: number;
  label: string;
  createdAt: number;
};

export type Bookmark = NexaMonacoBookmark | NexaReactWidgetBookmark;

export function isMonacoBookmark(bm: Bookmark): bm is NexaMonacoBookmark {
  return bm.kind === 'Text';
}

export function isReactWidgetBookmark(
  bm: Bookmark
): bm is NexaReactWidgetBookmark {
  return bm.kind === 'UI';
}

export function bookmarkToLocation(bm: NexaMonacoBookmark): vscode.Location {
  const uri = vscode.Uri.parse(bm.uri);
  const pos = new vscode.Position(bm.line, bm.character);
  return new vscode.Location(uri, pos);
}

