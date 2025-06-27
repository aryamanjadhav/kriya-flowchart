// src/ui/FlowCanvas.js

const interact = window.interact;

export default class FlowCanvas {
  constructor(selector, onNodeMove, onEdgeClick, onEdgeDblClick) {
    this.container = document.querySelector(selector);
    this.svg = this.container.querySelector('#edge-layer');
    this.onNodeMove = onNodeMove;
    this.onEdgeClick = onEdgeClick;
    this.onEdgeDblClick = onEdgeDblClick;

    // Inject two arrowhead markers if not already present
    if (!this.svg.querySelector('defs')) {
      const ns = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(ns, 'defs');

      // → marker for normal end
      const mEnd = document.createElementNS(ns, 'marker');
      mEnd.setAttribute('id', 'arrow-end');
      mEnd.setAttribute('viewBox', '0 0 10 7');
      mEnd.setAttribute('markerUnits', 'userSpaceOnUse');
      mEnd.setAttribute('markerWidth', '10');
      mEnd.setAttribute('markerHeight', '7');
      mEnd.setAttribute('refX', '7');
      mEnd.setAttribute('refY', '3.5');
      mEnd.setAttribute('orient', 'auto');
      const pEnd = document.createElementNS(ns, 'polygon');
      pEnd.setAttribute('points', '0 0, 10 3.5, 0 7');
      pEnd.setAttribute('fill', '#333');
      mEnd.appendChild(pEnd);
      defs.appendChild(mEnd);

      // ← marker for reversed start
      const mStart = document.createElementNS(ns, 'marker');
      mStart.setAttribute('id', 'arrow-start');
      mStart.setAttribute('viewBox', '0 0 10 7');
      mStart.setAttribute('markerUnits', 'userSpaceOnUse');
      mStart.setAttribute('markerWidth', '10');
      mStart.setAttribute('markerHeight', '7');
      mStart.setAttribute('refX', '3');
      mStart.setAttribute('refY', '3.5');
      mStart.setAttribute('orient', 'auto');
      const pStart = document.createElementNS(ns, 'polygon');
      pStart.setAttribute('points', '10 0, 0 3.5, 10 7'); // flipped shape
      pStart.setAttribute('fill', '#333');
      mStart.appendChild(pStart);
      defs.appendChild(mStart);

      this.svg.appendChild(defs);
    }
  }
  renderNodes(nodes) {
    this.container.querySelectorAll('.node').forEach(el => el.remove());
    nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `node ${n.type === 'TASK' ? 'task' : 'dist'}`;
      el.id = n.id;
      el.textContent = n.title;
      const { x, y } = n;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.dataset.x = x; el.dataset.y = y;
      interact(el).draggable({
        listeners: {
          move: ev => {
            const nx = (parseFloat(el.dataset.x) || 0) + ev.dx;
            const ny = (parseFloat(el.dataset.y) || 0) + ev.dy;
            el.style.transform = `translate(${nx}px, ${ny}px)`;
            el.dataset.x = nx; el.dataset.y = ny;
            this.onNodeMove(n.id, nx, ny);
          }
        }
      });
      this.container.appendChild(el);
    });
  }

  // src/ui/FlowCanvas.js (inside your FlowCanvas class)

  renderEdges(edges, nodeMap) {
    // 1) Preserve your <defs> (arrowhead markers), clear out old lines
    const defsHtml = this.svg.querySelector('defs')?.outerHTML || '';
    this.svg.innerHTML = defsHtml;

    // 2) Grab canvas position for coordinate math
    const canvasRect = this.container.getBoundingClientRect();

    // 3) For each edge, compute endpoints and draw a <line>
    edges.forEach(e => {
      const A = nodeMap[e.sourceId];
      const B = nodeMap[e.targetId];
      if (!A || !B) return;

      const aRect = A.getBoundingClientRect();
      const bRect = B.getBoundingClientRect();
      const ax = aRect.left + aRect.width / 2;
      const ay = aRect.top + aRect.height / 2;
      const bx = bRect.left + bRect.width / 2;
      const by = bRect.top + bRect.height / 2;
      const dx = bx - ax;
      const dy = by - ay;

      let x1, y1, x2, y2;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (dx > 0) {
          x1 = aRect.right; y1 = aRect.top + aRect.height / 2;
          x2 = bRect.left; y2 = bRect.top + bRect.height / 2;
        } else {
          x1 = aRect.left; y1 = aRect.top + aRect.height / 2;
          x2 = bRect.right; y2 = bRect.top + bRect.height / 2;
        }
      } else {
        // Vertical
        if (dy > 0) {
          x1 = aRect.left + aRect.width / 2; y1 = aRect.bottom;
          x2 = bRect.left + bRect.width / 2; y2 = bRect.top;
        } else {
          x1 = aRect.left + aRect.width / 2; y1 = aRect.top;
          x2 = bRect.left + bRect.width / 2; y2 = bRect.bottom;
        }
      }

      // Translate into SVG coords
      x1 -= canvasRect.left; y1 -= canvasRect.top;
      x2 -= canvasRect.left; y2 -= canvasRect.top;

      // Create the SVG line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#333');
      line.setAttribute('stroke-width', '2');

      // Clear any existing markers or dash styles
      line.removeAttribute('marker-end');
      line.removeAttribute('marker-start');
      line.removeAttribute('stroke-dasharray');

      // Apply the correct style
      if (e.style === 'normal') {
        line.setAttribute('marker-end', 'url(#arrow-end)');
      } else if (e.style === 'dotted') {
        line.setAttribute('stroke-dasharray', '4 4');
      } else if (e.style === 'reversed') {
        line.setAttribute('marker-start', 'url(#arrow-start)');
      }

      line.dataset.id = e.id;

      // Single-click: debounce to allow dblclick to preempt
      let clickTimer;
      line.addEventListener('click', evt => {
        evt.stopPropagation();
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          this.onEdgeClick(e.id);
        }, 250);
      });

      // Double-click: cancel single-click and delete immediately
      line.addEventListener('dblclick', evt => {
        evt.stopPropagation();
        clearTimeout(clickTimer);
        this.onEdgeDblClick(e.id);
      });

      this.svg.appendChild(line);
    });
  }
}