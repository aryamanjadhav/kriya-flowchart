// src/ui/FlowCanvas.js

// Use the global interact.js loaded via CDN
const interact = window.interact;

// map logical status → color
const STATUS_COLORS = {
  todo: '#e74c3c',  // red
  'in-progress': '#f1c40f',  // yellow
  done: '#2ecc71'   // green
};

export const DIST_COLORS = [
  '#333333',  // black
  '#3498db',  // blue
  '#c0392b',  // red
  '#e75c12',  // orange
  '#2ecc71',  // green
  '#e9c40f',  // yellow
  '#f0f0f0',  // white
  '#9b59b6'   // purple
];

export default class FlowCanvas {
  /**
   * @param {string}   selector
   * @param {function} onNodeMove
   * @param {function} onNodeTextChange
   * @param {function} onNodeStatusChange
   * @param {function}       onNodeDistTypeChange 
   * @param {function} onEdgeClick
   * @param {function} onEdgeDblClick
   */
  constructor(
    selector,
    onNodeMove,
    onNodeTextChange,
    onNodeStatusChange,
    onNodeDistTypeChange,
    onEdgeClick,
    onEdgeDblClick
  ) {
    this.container = document.querySelector(selector);
    this.svg = this.container.querySelector('#edge-layer');
    this.onNodeMove = onNodeMove;
    this.onNodeTextChange = onNodeTextChange;
    this.onNodeStatusChange = onNodeStatusChange;
    this.onNodeDistTypeChange = onNodeDistTypeChange;  // <-- store callback
    this.onEdgeClick = onEdgeClick;
    this.onEdgeDblClick = onEdgeDblClick;

    // Inject arrowhead markers once
    if (this.svg && !this.svg.querySelector('defs')) {
      const ns = 'http://www.w3.org/2000/svg';
      const defs = document.createElementNS(ns, 'defs');

      // → normal end
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
      pEnd.setAttribute('points', '0 0,10 3.5,0 7');
      pEnd.setAttribute('fill', '#333');
      mEnd.appendChild(pEnd);
      defs.appendChild(mEnd);

      // ← reversed start
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
      pStart.setAttribute('points', '10 0,0 3.5,10 7');
      pStart.setAttribute('fill', '#333');
      mStart.appendChild(pStart);
      defs.appendChild(mStart);

      this.svg.appendChild(defs);
    }
  }

  renderNodes(nodes) {
    // clear existing nodes (keep the SVG)
    this.container.querySelectorAll('.node').forEach(el => el.remove());

    nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = `node ${n.type === 'TASK' ? 'task' : 'dist'}`;
      el.id = n.id;

      // ── Title ───────────────────────────────
      const titleEl = document.createElement('div');
      titleEl.className = 'node-title';
      titleEl.innerText = n.title;

      titleEl.contentEditable = true;
      titleEl.addEventListener('blur', () => {
        this.onNodeTextChange(n.id, titleEl.innerText.trim());
      });
      titleEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleEl.blur();
        }
      });

      el.appendChild(titleEl);


      // DISTRACTION: 7-color bar at bottom
      if (n.type === 'DISTRACTION') {
        const barEl = document.createElement('div');
        barEl.className = 'dist-bar';
        // default to index 0 if missing
        const idx = (typeof n.distractionType === 'number')
          ? n.distractionType
          : 0;
        barEl.style.backgroundColor = DIST_COLORS[idx];
        barEl.addEventListener('click', e => {
          e.stopPropagation();
          this.onNodeDistTypeChange(n.id);
        });
        el.appendChild(barEl);
      }

      // ── Status Pill ──────────────────────────
      if (n.type === 'TASK') {
        const statusEl = document.createElement('div');
        statusEl.className = 'status-indicator';
        const status = n.status || 'todo';
        statusEl.style.backgroundColor = STATUS_COLORS[status];
        statusEl.addEventListener('click', e => {
          e.stopPropagation();
          this.onNodeStatusChange(n.id);
        });
        el.appendChild(statusEl);
      }

      // ── Draggable Position ───────────────────
      const { x, y } = n;
      el.style.transform = `translate(${x}px,${y}px)`;
      el.dataset.x = x;
      el.dataset.y = y;
      interact(el).draggable({
        listeners: {
          move: ev => {
            const nx = (parseFloat(el.dataset.x) || 0) + ev.dx;
            const ny = (parseFloat(el.dataset.y) || 0) + ev.dy;
            el.style.transform = `translate(${nx}px,${ny}px)`;
            el.dataset.x = nx;
            el.dataset.y = ny;
            this.onNodeMove(n.id, nx, ny);
          }
        }
      });

      this.container.appendChild(el);
    });
  }

  renderEdges(edges, nodeMap) {
    // preserve <defs>, clear any existing lines
    const defsHtml = this.svg.querySelector('defs')?.outerHTML || '';
    this.svg.innerHTML = defsHtml;

    const rect = this.container.getBoundingClientRect();
    edges.forEach(e => {
      const A = nodeMap[e.sourceId], B = nodeMap[e.targetId];
      if (!A || !B) return;
      const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
      const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      let x1, y1, x2, y2;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) { x1 = a.right; y1 = a.top + a.height / 2; x2 = b.left; y2 = b.top + b.height / 2; }
        else { x1 = a.left; y1 = a.top + a.height / 2; x2 = b.right; y2 = b.top + b.height / 2; }
      } else {
        if (dy > 0) { x1 = a.left + a.width / 2; y1 = a.bottom; x2 = b.left + b.width / 2; y2 = b.top; }
        else { x1 = a.left + a.width / 2; y1 = a.top; x2 = b.left + b.width / 2; y2 = b.bottom; }
      }
      x1 -= rect.left; y1 -= rect.top;
      x2 -= rect.left; y2 -= rect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#333');
      line.setAttribute('stroke-width', '2');
      line.removeAttribute('marker-end');
      line.removeAttribute('marker-start');
      line.removeAttribute('stroke-dasharray');
      if (e.style === 'normal') line.setAttribute('marker-end', 'url(#arrow-end)');
      else if (e.style === 'dotted') line.setAttribute('stroke-dasharray', '4 4');
      else if (e.style === 'reversed') line.setAttribute('marker-start', 'url(#arrow-start)');
      line.dataset.id = e.id;

      let timer;
      line.addEventListener('click', evt => {
        evt.stopPropagation();
        clearTimeout(timer);
        timer = setTimeout(() => this.onEdgeClick(e.id), 250);
      });
      line.addEventListener('dblclick', evt => {
        evt.stopPropagation();
        clearTimeout(timer);
        this.onEdgeDblClick(e.id);
      });

      this.svg.appendChild(line);
    });
  }
}