import * as vscode from 'vscode';

/**
 * Dynalist Mover for VS Code
 *
 * Ported from the Obsidian "Dynalist Mover" plugin. Moves the current selection
 * (or cursor line) up/down, optionally carrying along any indented child lines so
 * a parent item and its descendants move as a single block — mirroring Dynalist's
 * outliner behavior. Works on any text, not just Markdown lists.
 */

export function activate(context: vscode.ExtensionContext) {
    const highlight = new SelectionHighlighter();
    context.subscriptions.push(highlight);

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('dynalistMover.moveLinesUp', (editor, edit) => {
            void moveLines(editor, -1);
        }),
        vscode.commands.registerTextEditorCommand('dynalistMover.moveLinesDown', (editor, edit) => {
            void moveLines(editor, 1);
        })
    );
}

export function deactivate() {
    // nothing to clean up beyond disposables registered in activate()
}

function getConfig() {
    const cfg = vscode.workspace.getConfiguration('dynalistMover');
    return {
        moveChildrenWithParent: cfg.get<boolean>('moveChildrenWithParent', true),
        highlightSelection: cfg.get<boolean>('highlightSelection', true)
    };
}

/** Number of spaces a tab expands to, per the active editor's settings. */
function getTabSize(editor: vscode.TextEditor): number {
    const size = editor.options.tabSize;
    return typeof size === 'number' && Number.isFinite(size) ? Math.max(1, size) : 4;
}

/** Visual indentation width of a line's leading whitespace (tabs expanded). */
function getIndentLength(str: string, tabSize: number): number {
    const match = str.match(/^[ \t]*/);
    if (!match) {
        return 0;
    }
    let length = 0;
    for (const ch of match[0]) {
        length += ch === '\t' ? tabSize : 1;
    }
    return length;
}

async function moveLines(editor: vscode.TextEditor, direction: number): Promise<void> {
    const { moveChildrenWithParent } = getConfig();
    const doc = editor.document;
    const tabSize = getTabSize(editor);
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const lineText = (i: number) => doc.lineAt(i).text;

    if (editor.selections.length > 1) {
        vscode.window.showInformationMessage('Dynalist Mover supports one selection at a time.');
        return;
    }

    const selection = editor.selection;

    // VS Code's Selection.start/end are already ordered (start <= end).
    let startLine = selection.start.line;
    let endLine = selection.end.line;

    // If the selection ends at character 0 of a following line, that line isn't
    // really part of the block being moved.
    if (startLine !== endLine && selection.end.character === 0) {
        endLine--;
    }

    // 1. Expand the block downward to include indented children of the last line.
    if (moveChildrenWithParent) {
        const lastLineIndent = getIndentLength(lineText(endLine), tabSize);
        for (let i = endLine + 1; i < doc.lineCount; i++) {
            const str = lineText(i);
            if (str.trim().length === 0) {
                break;
            }
            if (getIndentLength(str, tabSize) > lastLineIndent) {
                endLine = i;
            } else {
                break;
            }
        }
    }

    const baseIndent = getIndentLength(lineText(startLine), tabSize);

    let range: vscode.Range;
    let replacement: string;
    let offset: number;

    if (direction === -1) {
        // MOVE UP
        if (startLine === 0) {
            return;
        }

        let targetLine = startLine - 1;

        // Skip over the children of the previous sibling so we land above the
        // whole sibling block, not in the middle of it.
        if (moveChildrenWithParent) {
            while (targetLine > 0 && getIndentLength(lineText(targetLine), tabSize) > baseIndent) {
                targetLine--;
            }
        }

        const blockToJumpOver = collectLines(lineText, targetLine, startLine - 1);
        const blockToMove = collectLines(lineText, startLine, endLine);

        replacement = blockToMove.join(eol) + eol + blockToJumpOver.join(eol);
        offset = startLine - targetLine;
        range = new vscode.Range(targetLine, 0, endLine, lineText(endLine).length);
        offset = -offset;
    } else {
        // MOVE DOWN
        if (endLine === doc.lineCount - 1) {
            return;
        }

        const nextLine = endLine + 1;
        let targetLine = nextLine;

        // Skip over the children of the next sibling.
        if (moveChildrenWithParent) {
            const nextIndent = getIndentLength(lineText(nextLine), tabSize);
            if (nextIndent >= baseIndent) {
                for (let i = nextLine + 1; i < doc.lineCount; i++) {
                    const str = lineText(i);
                    if (str.trim().length === 0) {
                        break;
                    }
                    if (getIndentLength(str, tabSize) > nextIndent) {
                        targetLine = i;
                    } else {
                        break;
                    }
                }
            }
        }

        const blockToMove = collectLines(lineText, startLine, endLine);
        const blockToJumpOver = collectLines(lineText, endLine + 1, targetLine);

        replacement = blockToJumpOver.join(eol) + eol + blockToMove.join(eol);
        offset = targetLine - endLine;
        range = new vscode.Range(startLine, 0, targetLine, lineText(targetLine).length);
    }

    const ok = await editor.edit(
        editBuilder => editBuilder.replace(range, replacement),
        { undoStopBefore: true, undoStopAfter: true }
    );

    if (!ok) {
        return;
    }

    // Preserve the original selection, shifted by the number of lines moved.
    const newAnchor = new vscode.Position(selection.anchor.line + offset, selection.anchor.character);
    const newActive = new vscode.Position(selection.active.line + offset, selection.active.character);
    editor.selection = new vscode.Selection(newAnchor, newActive);
    editor.revealRange(new vscode.Range(newAnchor, newActive));
}

function collectLines(lineText: (i: number) => string, from: number, to: number): string[] {
    const lines: string[] = [];
    for (let i = from; i <= to; i++) {
        lines.push(lineText(i));
    }
    return lines;
}

/**
 * Highlights the full lines of a non-empty multi-line selection with a light
 * blue background, echoing the Obsidian plugin's visual cue.
 */
class SelectionHighlighter implements vscode.Disposable {
    private readonly decoration: vscode.TextEditorDecorationType;
    private readonly disposables: vscode.Disposable[] = [];

    constructor() {
        this.decoration = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: 'rgba(0, 122, 255, 0.12)'
        });

        this.disposables.push(
            this.decoration,
            vscode.window.onDidChangeTextEditorSelection(e => this.update(e.textEditor)),
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.update(editor);
                }
            }),
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('dynalistMover.highlightSelection') && vscode.window.activeTextEditor) {
                    this.update(vscode.window.activeTextEditor);
                }
            })
        );

        if (vscode.window.activeTextEditor) {
            this.update(vscode.window.activeTextEditor);
        }
    }

    private update(editor: vscode.TextEditor): void {
        if (!getConfig().highlightSelection) {
            editor.setDecorations(this.decoration, []);
            return;
        }

        const ranges: vscode.Range[] = [];
        for (const sel of editor.selections) {
            if (sel.isEmpty || sel.start.line === sel.end.line) {
                continue;
            }
            let endLine = sel.end.line;
            if (sel.end.character === 0) {
                endLine--;
            }
            if (endLine >= sel.start.line) {
                ranges.push(new vscode.Range(sel.start.line, 0, endLine, 0));
            }
        }
        editor.setDecorations(this.decoration, ranges);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
