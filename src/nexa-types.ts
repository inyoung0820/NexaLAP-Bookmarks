import * as vscode from 'vscode';

export type Bookmark = {
  id: string;
  uri: string;
  line: number;
  character: number;
  label: string;
  createdAt: number;
};

export function bookmarkToLocation(bm: Bookmark): vscode.Location {
  const uri = vscode.Uri.parse(bm.uri);
  const pos = new vscode.Position(bm.line, bm.character);
  return new vscode.Location(uri, pos);
}

