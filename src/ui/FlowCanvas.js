// src/ui/FlowCanvas.js
// grab the global interact() loaded by your <script> in index.html
const interact = window.interact;

export default class FlowCanvas {
  /**
   * @param {string} selector  CSS selector for your canvas container
   * @param {(id: string, x: number, y: number) => void} onNodeMove
   */
  constructor(selector, onNodeMove) {
    this.container = document.querySelector(selector);
    this.onNodeMove = onNodeMove;
  }

  renderNodes(nodes) {
    // clear out old
    this.container.innerHTML = '';

    nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `node ${n.type === 'TASK' ? 'task' : 'dist'}`;
      el.id = n.id;

      // Position & title
      el.style.transform = `translate(${n.x}px, ${n.y}px)`;
      el.setAttribute('data-x', n.x);
      el.setAttribute('data-y', n.y);
      el.textContent = n.title;

      // Make draggable
      interact(el).draggable({
        listeners: {
          move: event => {
            // calculate new position
            const x = (parseFloat(el.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(el.getAttribute('data-y')) || 0) + event.dy;

            // apply
            el.style.transform = `translate(${x}px, ${y}px)`;
            el.setAttribute('data-x', x);
            el.setAttribute('data-y', y);

            // inform controller of the move
            this.onNodeMove(n.id, x, y);
          }
        }
      });

      this.container.appendChild(el);
    });
  }

  renderEdges(edges, nodeMap) {
    // we'll wire this up next—ignore for now
  }
}