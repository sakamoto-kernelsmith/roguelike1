// =============================================================================
// Input Handling
// =============================================================================

const Input = {
  callback: null,

  init(callback) {
    this.callback = callback;
    document.addEventListener('keydown', (e) => this.handleKey(e));
  },

  handleKey(e) {
    if (!this.callback) return;

    let action = null;

    switch (e.key) {
      // Movement - Arrow keys
      case 'ArrowUp':    action = { type: 'move', dx: 0, dy: -1 }; break;
      case 'ArrowDown':  action = { type: 'move', dx: 0, dy: 1 };  break;
      case 'ArrowLeft':  action = { type: 'move', dx: -1, dy: 0 }; break;
      case 'ArrowRight': action = { type: 'move', dx: 1, dy: 0 };  break;

      // Movement - WASD (only when not conflicting with skills)
      case 'w': case 'W': action = { type: 'move', dx: 0, dy: -1 }; break;
      case 's': case 'S': action = { type: 'move', dx: 0, dy: 1 };  break;
      case 'a': case 'A': action = { type: 'move', dx: -1, dy: 0 }; break;
      case 'd': case 'D': action = { type: 'move', dx: 1, dy: 0 };  break;

      // Wait
      case ' ': action = { type: 'wait' }; break;

      // Skills (disabled)
      // case 'q': case 'Q': action = { type: 'skill', key: 'q' }; break;
      // case 'e': case 'E': action = { type: 'skill', key: 'e' }; break;
      // case 'r': case 'R': action = { type: 'skill', key: 'r' }; break;
      // case 'f': case 'F': action = { type: 'skill', key: 'f' }; break;

      // Drop item (Q + number)
      case 'q': case 'Q': action = { type: 'drop_mode' }; break;

      // Search
      case 'x': case 'X': action = { type: 'search' }; break;

      // Cast magic
      case 'm': case 'M': action = { type: 'cast_magic' }; break;

      // Hint re-display (tutorial)
      case 'h': case 'H': action = { type: 'hint' }; break;

      // Numpad & number keys (1-9)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        if (e.location === 3) {
          // Numpad: movement/diagonal
          switch (e.key) {
            case '7': action = { type: 'move', dx: -1, dy: -1 }; break;
            case '8': action = { type: 'move', dx: 0, dy: -1 }; break;
            case '9': action = { type: 'move', dx: 1, dy: -1 }; break;
            case '4': action = { type: 'move', dx: -1, dy: 0 }; break;
            case '5': action = { type: 'wait' }; break;
            case '6': action = { type: 'move', dx: 1, dy: 0 }; break;
            case '1': action = { type: 'move', dx: -1, dy: 1 }; break;
            case '2': action = { type: 'move', dx: 0, dy: 1 }; break;
            case '3': action = { type: 'move', dx: 1, dy: 1 }; break;
          }
        } else {
          // Main keyboard: use item
          action = { type: 'use_item', slot: parseInt(e.key) - 1 };
        }
        break;

      // Descend stairs
      case 'Enter': action = { type: 'descend' }; break;

      // Escape (close shop)
      case 'Escape': action = { type: 'escape' }; break;
    }

    if (action) {
      e.preventDefault();
      this.callback(action);
    }
  },
};
