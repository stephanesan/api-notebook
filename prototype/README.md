JS Notebook Spec
================

## Running the prototype

1. Start a local server

        python -m SimpleHTTPServer 80

2. Navigate to [http://localhost](http://localhost)

## Overview

### Definitions
- **Cell**: A block of either code or text.
  - Code cells have one or more statements.
  - A code cell consists of statements and a result. The result pertains to the
    last statement invocation of the code cell.
  - Text cells use Markdown for formatting.
- **Object inspector**: A webkit developer tools-like object inspector for
  navigating statement result objects. Appears in a result cell.
- **Cell Label**: The number next to a cell.
  - Used to refer to the result via `result[label]`.
  - Should be editable (result global should be a hash).
- **Current cell**: The cell that currently has focus.
  - A focused cell becomes editable.
  - An edited code cell's statements are executed upon de-focus by any means.
- **Toolbar**: The pop-out row of buttons that appear next to a **cell** when it
  has focus, or when the user mouses over a cell.

### Key requirements
- Notebook should behave like a JavaScript console, much like the Webkit web
  inspector console.
- Notebook should be able to incorporate text notes as a secondary function.
- Code cells should provide syntax highlighting and auto-completion.
- Code cells should yield a result that can be referred to programmatically.
- Application should expose an API to enable programmatic population of
  notebooks. The UI client should be built on top of this API.
- 

## UX - Behavior Specifics

### Code cell - Statement
- Has a blue prompt when active.
- Has a gray prompt when inactive (statement has been executed).

### Code Cell - Result
- Appears when the preceding code cell statement is executed and the result has
  been calculated.
- Displays the result of the last statement in the code cell.
- Will populate an object inspector when a statement invocation returns an
  object or an array.

### Object Inspector
- Can be expanded to browse object properties (model: webkit developer tools).
- Is always collapsed by default.

### Text cell
- Supports markdown.
- Content is surrounded by JavaScript block comment markers.
- Can be started by typing "/*" in a code cell.
  - Any previous code cell statements are broken off into a separate code cell.
- Can be ended by typing "*/".
- If a text cell loses focus, "\n*/" should be appended.
- Note on visual style: The comment markers should remain visible (as a queue for
  closing the cell), but have a smaller font size and subdued color.

### Cell Labels
- Clicking a cell label lets the user edit the label
- The label is used as a lookup property in the global `results` hash.

### Toolbar Controls
- Toggle cell type:
  - Changes a code cell to a text cell.
  - Changes a text cell to a code cell.
- New cell:
  - Creates a new cell underneath current cell.
- Copy cell:
  - Creates a clone of current cell underneath current cell.
- Delete cell:
  - Prompts the user to confirm intent; deletes cell on confirmation.

### Running Code
- The code in a notebook will not execute until the user presses a "run" button.
- Code cells are executed sequentially.
- Cells can depend on state set by preceding cells (notebook is one scope).

### Creating a New Cell
- User can create a new cell after an existing cell by clicking the "New Cell"
  button in an existing cell's toolbar, or:
  - by pressing "return" in the last (code) cell in the notebook.
  - by entering "*/" on the last line of the last (text) cell in the notebook.
- If a new, empty cell already exists after the current cell, the "New Cell"
  button should be disabled.

### Other Features
- Hovering (mousing) over a cell reveals a "move" handle in top right corner.
  Dragging this handle lets the user move the cell vertically, changing the
  internal order of cells. This changes the internal index of the cell, and any
  reference to the cell's result will have to be changed manually.

## UI Behavior Tables

### Cell Feature Visibility
<table>
  <tr><th>Feature</th><th>hover</th><th>focus</th></tr>
  <tr><td>Drag handle</td><td>x</td><td></td></tr>
  <tr><td>Heavy border</td><td>x</td><td></td></tr>
  <tr><td>Toolbar</td><td>x</td><td>x</td></tr>
  <tr><td>Edit mode</td><td></td><td>x</td></tr>
</table>

### Keymap

Mac OS X bindings. For PC, substitute "Ctrl" for "Cmd", and "alt" for "opt".
Commands with modifier eys are tentative and serve mostly to illustrate
possibilities.

<table>
  <tr><th>Key Combination</th><th>Action</th></tr>
  <tr><td>return</td><td>Execute current statement</td></tr>
  <tr><td>shift-return</td><td>Add newline to current code cell, making room for
  another statement</td></tr>
  <tr><td>Cmd-backspace</td><td>Delete cell (confirmation)</td></tr>
  <tr><td>Cmd-opt-c</td><td>Copy cell</td></tr>
  <tr><td>Cmd-opt-b</td><td>Change cell type (text/code)</td></tr>
  <tr><td>opt-uparrow</td><td>Focus on previous cell</td></tr>
  <tr><td>opt-downarrow</td><td>Focus on next cell</td></tr>
  <tr><td>Cmd-opt-uparrow</td><td>Move cell up one position</td></tr>
  <tr><td>Cmd-opt-downarrow</td><td>Move cell down one position</td></tr>
</table>
