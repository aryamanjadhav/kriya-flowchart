export default class FlowCanvas {
    constructor(selector) {
      this.container = document.querySelector(selector);
    }
  
    renderNodes(nodes) {
      this.container.innerHTML = '';
      nodes.forEach(n => {
        const el = document.createElement('div');
        el.className = `node ${n.type === 'TASK' ? 'task' : 'dist'}`;
        el.id = n.id;
        el.textContent = n.title;
        el.style.transform = `translate(${n.x}px,${n.y}px)`;
        this.container.appendChild(el);
        // you’ll wire up interact.js and click handlers here
      });
    }
  
    renderEdges(edges, nodeMap) {
      // clear existing lines, then for each edge:
      // new LeaderLine(nodeMap[e.sourceId], nodeMap[e.targetId]);
    }
  }