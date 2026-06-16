# Dynalist Mover for VS Code

Move the current line — or a multi-line selection — **together with its indented child items** up or down, bringing a Dynalist-like outliner editing experience to Visual Studio Code.

This is a VS Code port of the [Dynalist Mover](https://github.com/OneOffObject/dynalist-mover) Obsidian plugin.

## Why not just `Alt+↑`/`Alt+↓`?

VS Code's built-in *Move Line Up/Down* moves only the selected lines — it leaves indented children behind and drops the line into the middle of the next sibling block. Dynalist Mover treats a parent and all of its indented descendants as a single unit and jumps cleanly over neighboring blocks, just like an outliner.

When the current line has no children, the behavior is identical to a normal line move, so it's a safe drop-in superset.

## Features

- **Move blocks with children** — moving a parent item carries all of its indented child items as one block.
- **Works with any text** — not limited to Markdown lists. Paragraphs, code, headings, anything.
- **Selection preserved** — the selection is kept after the move, so repeated key presses keep nudging the block.
- **Indent-aware** — child detection follows the editor's own `Tab Size` / `Insert Spaces` settings per file.
- **Visual highlight** — multi-line selections get a light blue line background, Dynalist-style (toggleable).

## Usage

1. Place the cursor on a line, or select one or more lines.
2. Press **`Ctrl+Shift+Alt+↑`** / **`Ctrl+Shift+Alt+↓`** (on macOS **`Cmd+Shift+Alt+↑/↓`**), or run the commands from the Command Palette:
   - `Dynalist Mover: Move selected lines up`
   - `Dynalist Mover: Move selected lines down`

The default keys are deliberately chosen to **not** collide with any built-in VS Code shortcut.

### Prefer `Alt+↑/↓`?

`Alt+↑/↓` is the most natural fit, but VS Code already binds it to its own *Move Line* command. An extension can't override a built-in default, so you have to claim the key in your **personal** keybindings (which always win). Open **`Preferences: Open Keyboard Shortcuts (JSON)`** from the Command Palette and add:

```json
[
  { "key": "alt+up",   "command": "dynalistMover.moveLinesUp",          "when": "editorTextFocus && !editorReadonly" },
  { "key": "alt+up",   "command": "-editor.action.moveLinesUpAction",   "when": "editorTextFocus && !editorReadonly" },
  { "key": "alt+down", "command": "dynalistMover.moveLinesDown",        "when": "editorTextFocus && !editorReadonly" },
  { "key": "alt+down", "command": "-editor.action.moveLinesDownAction", "when": "editorTextFocus && !editorReadonly" }
]
```

The `-` lines remove the built-in *Move Line* binding so only Dynalist Mover responds. To rebind to anything else, search for "Dynalist Mover" in the **Keyboard Shortcuts** UI.

## Settings

| Setting | Default | Description |
|---|---|---|
| `dynalistMover.moveChildrenWithParent` | `true` | Move indented children along with their parent as one block. Turn off to move only the selected lines. |
| `dynalistMover.highlightSelection` | `true` | Highlight the full lines of a multi-line selection with a light blue background. |

## Development

```bash
npm install
npm run compile     # or: npm run watch
```

Press **F5** in VS Code to launch an Extension Development Host with the extension loaded.

## License

[MIT](LICENSE)
