# Changelog

All notable changes to the "Dynalist Mover" extension are documented in this file.

## [1.1.0]

- Selections now snap to the complete outline block (a parent and its whole
  subtree) before moving, matching Dynalist. Selecting part of a subtree
  (e.g. `d, e`) pulls in the rest (`f`) so the block stays intact, and the
  highlight previews exactly what will move.
- The snapped block can now move past its parent boundary, keeping its
  indentation (no auto-outdent). Moves remain fully reversible.
- The whole moved block is selected after a move, so repeated presses and
  up/down round-trips stay consistent.

## [1.0.1]

- Add a changelog.

## [1.0.0]

- Initial release.
- Move the current line or selection up/down, carrying along indented child
  items as a single block (Dynalist-like outliner behavior).
- Works on any text, not just Markdown lists.
- Selection is preserved after the move.
- Child detection follows the editor's own tab settings.
- Optional light blue highlight for multi-line selections.
