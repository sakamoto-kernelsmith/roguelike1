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

      // Movement - WASD
      case 'w': case 'W': action = { type: 'move', dx: 0, dy: -1 }; break;
      case 's': case 'S': action = { type: 'move', dx: 0, dy: 1 };  break;
      case 'a': case 'A': action = { type: 'move', dx: -1, dy: 0 }; break;
      case 'd': case 'D': action = { type: 'move', dx: 1, dy: 0 };  break;

      // Diagonal - numpad
      case '7': action = { type: 'move', dx: -1, dy: -1 }; break;
      case '9': action = { type: 'move', dx: 1, dy: -1 };  break;
      case '1': if (e.location === 3) { action = { type: 'move', dx: -1, dy: 1 }; } break;
      case '3': if (e.location === 3) { action = { type: 'move', dx: 1, dy: 1 }; }  break;
      case '8': action = { type: 'move', dx: 0, dy: -1 }; break;
      case '2': if (e.location === 3) { action = { type: 'move', dx: 0, dy: 1 }; } break;
      case '4': if (e.location === 3) { action = { type: 'move', dx: -1, dy: 0 }; } break;
      case '6': if (e.location === 3) { action = { type: 'move', dx: 1, dy: 0 }; } break;
      case '5': if (e.location === 3) { action = { type: 'wait' }; } break;

      // Wait
      case ' ': action = { type: 'wait' }; break;

      // Use items (1-9 from main keyboard)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        if (e.location !== 3) { // Not numpad
          action = { type: 'use_item', slot: parseInt(e.key) - 1 };
        }
        break;

      // Descend stairs
      case 'Enter': action = { type: 'descend' }; break;
    }

    if (action) {
      e.preventDefault();
      this.callback(action);
    }
  },
};
