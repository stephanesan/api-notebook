JS Notebook UX Spec
===================

## Overview

### Definitions
- **Cell**: A block of content. There are two types: Code cell and Text cell. Text cells use Markdown for formatting. [CodeMirror](http://codemirror.net/) supports Markdown, so it probably makes sense to implement each cell as a CodeMirror instance.
- **Current cell**: The cell that currently has focus.
- **Toolbar**: The pop-out row of buttons that appear next to a **cell** when it has focus, or when the user mouses over it.

### Key requirements
- Application should expose an API to enable programmatic population of notebooks. The UI client should be built on top of this API.
- Code cells should provide syntax highlighting and auto-completion.
- Code cells should yield a result that can be referred to programmatically.
- Asynchronous code cells should halt execution (through use of [grunt-like syntax](http://gruntjs.com/creating-tasks#custom-tasks): `var done = this.async();`).

### Development Phases

### Phase 1
- JS Notebook API
- UI (MVP) built on top of API
  - Basic markdown support
  - Syntax highlighting
  - Auto-completion
  - Fully keyboard-navigable

### Phase 2
- Notebook should be embeddable in any web page context

### Phase 3
- The future!
- Markdown editor more like [prose.io](http://prose.io/)
- Auto-fix code cell result references when order of cells change

## Features

### Toolbar Features
- Toggle cell mode
  - Changes a code cell to a text cell
  - Changes a text cell to a code cell
- New cell
  - Creates a new cell underneath current cell
- Copy cell
  - Creates a clone of current cell underneath current cell
- Delete cell
  - Prompts the user to confirm intent; deletes cell on confirmation.

### Other Features
- Hovering (mousing) over a cell reveals a "move" handle in top right corner. Dragging this handle lets the user move the cell vertically, changing the internal order of cells.

## Behavior Specifics

### Creating a New Cell

- User can create a new cell after an existing cell by clicking the "New Cell" button in an existing cell's toolbar.
- If a new, empty cell already exists after the current cell, the "New Cell" button should be disabled.

### Cell Feature Visibility
<table>
  <tr><th>Feature</th><th>hover</th><th>focus</th></tr>
  <tr><td>Drag handle</td><td>x</td><td></td></tr>
  <tr><td>Heavy border</td><td>x</td><td>x</td></tr>
  <tr><td>Toolbar</td><td>x</td><td>x</td></tr>
  <tr><td>Edit mode</td><td></td><td>x</td></tr>
</table>

### Keymap
<table>
  <tr><th>Key Combination</th><th>Action</th></tr>
  <tr><td>Cmd-return</td><td>Create new cell underneath current cell</td></tr>
  <tr><td>Cmd-backspace</td><td>Delete cell (confirmation)</td></tr>
</table>

## Meta

### Mockup TODOs

- Find better icons:
  - Code mode
  - Text mode
  - Copy

### Open questions

- We should consider mobile usability
- Can we use _one_ CodeMirror instance, and specify multiple subareas (with different syntax) for cells?
- Is there a way to leverage Webkit web inspector code?

##
