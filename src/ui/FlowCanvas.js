// src/ui/FlowCanvas.js
import LeaderLine from 'leader-line';

export default class FlowCanvas {
  constructor(selector, onNodeMove) {
    this.container = document.querySelector(selector);
    this.onNodeMove = onNodeMove;
    this.lines = []; // track LeaderLine instances
  }

  renderNodes(nodes) {
    this.container.innerHTML = '';
    this.lines.forEach(line => line.remove());
    this.lines = [];

    nodes.forEach(n => {
      // …existing node-rendering + interact code…
    });
  }

  renderEdges(edges, nodeMap) {
    // Remove any old lines first
    this.lines.forEach(line => line.remove());
    this.lines = [];

    edges.forEach(e => {
      const startEl = nodeMap[e.sourceId];
      const endEl   = nodeMap[e.targetId];
      if (startEl && endEl) {
        const line = new LeaderLine(
          LeaderLine.pointAnchor(startEl, { x: '50%', y: '100%' }), // bottom-center
          LeaderLine.pointAnchor(endEl,   { x: '50%', y:   '0%' })  // top-center
        );
        this.lines.push(line);
      }
    });
  }
}