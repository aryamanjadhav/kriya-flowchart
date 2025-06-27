// src/ui/FlowCanvas.js

// Using global interact.js & LeaderLine from CDN
const interact = window.interact;
const LeaderLine = window.LeaderLine;

export default class FlowCanvas {
  constructor(selector, onNodeMove, onEdgeClick) {
    this.container = document.querySelector(selector);
    this.svg = this.container.querySelector('#edge-layer');
    this.onNodeMove = onNodeMove;
    this.onEdgeClick = onEdgeClick;
    this.lines = [];
  }

  renderNodes(nodes) {
    // Clear existing nodes and lines
    this.container.innerHTML = '';
    this.lines.forEach(({ leader }) => leader.remove());
    this.lines = [];

    nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `node ${n.type === 'TASK' ? 'task' : 'dist'}`;
      el.id = n.id;
      el.textContent = n.title;

      const { x, y } = n;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.dataset.x = x;
      el.dataset.y = y;

      // Make draggable
      interact(el).draggable({
        listeners: {
          move: event => {
            const nx = (parseFloat(el.dataset.x) || 0) + event.dx;
            const ny = (parseFloat(el.dataset.y) || 0) + event.dy;
            el.style.transform = `translate(${nx}px, ${ny}px)`;
            el.dataset.x = nx;
            el.dataset.y = ny;
            this.onNodeMove(n.id, nx, ny);
            // update any attached lines
            this.lines.forEach(({ startId, endId, leader }) => {
              if (startId === n.id || endId === n.id) {
                leader.position();
              }
            });
          }
        }
      });

      this.container.appendChild(el);
    });
  }

  renderEdges(edges, nodeMap) {
    console.log('[FlowCanvas] renderEdges called with:', edges, nodeMap);
    // … rest of method …
    // clear out old <line>s
    this.svg.innerHTML = '';
    const canvasRect = this.container.getBoundingClientRect();

    edges.forEach(e => {
      const A = nodeMap[e.sourceId];
      const B = nodeMap[e.targetId];
      if (!A || !B) return;

      // compute endpoints relative to canvas
      const a = A.getBoundingClientRect();
      const b = B.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - canvasRect.left;
      const y1 = a.bottom - canvasRect.top;
      const x2 = b.left + b.width / 2 - canvasRect.left;
      const y2 = b.top - canvasRect.top;

      // create the SVG <line>
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg', 'line'
      );
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.dataset.id = e.id;

      // wire up deletion on click
      line.addEventListener('click', () => this.onEdgeClick(e.id));

      this.svg.appendChild(line);
    });
  }
}
