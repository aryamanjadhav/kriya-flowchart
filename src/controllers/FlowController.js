// src/controllers/FlowController.js
import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas from '../ui/FlowCanvas.js';

export default class FlowController {
  constructor() {
    this.service = new StorageService();
    this.chart = new Flowchart();
    this.linkStartId = null;  // for linking
    this.selectedNodeId = null;  // for delete-on-key

    this.canvas = new FlowCanvas(
      '#canvas',
      this.handleNodeMove.bind(this),
      this.handleEdgeClick.bind(this),
      this.handleEdgeDblClick.bind(this)
    );

    // listen for Delete/Backspace
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  init() {
    // load saved state
    const saved = this.service.load();
    if (saved) this.chart = Flowchart.fromJSON(saved);

    this._renderAll();

    // toolbar
    document.getElementById('add-task').onclick = () => this.add('TASK');
    document.getElementById('add-dist').onclick = () => this.add('DISTRACTION');
    document.getElementById('clear-all').onclick = () => this.clearAll();

    // click on nodes or blank canvas
    this.canvas.container.addEventListener('click', e => {
      const nodeEl = e.target.closest('.node');
      if (nodeEl) {
        this.handleNodeSelect(nodeEl.id);
      } else {
        this.handleNodeDeselect();
      }
    });

    // dbl-click for linking
    this.canvas.container.addEventListener('dblclick', this.handleCanvasDblClick.bind(this));
  }

  // ─── Node selection / deselection ─────────────────

  handleNodeSelect(nodeId) {
    // clear previous
    if (this.selectedNodeId) {
      const prev = document.getElementById(this.selectedNodeId);
      if (prev) prev.classList.remove('selected');
    }
    // select new
    this.selectedNodeId = nodeId;
    const el = document.getElementById(nodeId);
    if (el) el.classList.add('selected');
  }

  handleNodeDeselect() {
    if (this.selectedNodeId) {
      const prev = document.getElementById(this.selectedNodeId);
      if (prev) prev.classList.remove('selected');
      this.selectedNodeId = null;
    }
  }

  handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNodeId) {
      this.deleteNode(this.selectedNodeId);
    }
  }

  deleteNode(nodeId) {
    // remove node
    this.chart.nodes = this.chart.nodes.filter(n => n.id !== nodeId);
    // remove connected edges
    this.chart.edges = this.chart.edges.filter(
      e => e.sourceId !== nodeId && e.targetId !== nodeId
    );
    this.service.save(this.chart);
    this.selectedNodeId = null;
    this._renderAll();
  }

  // ─── Node linking ─────────────────────────────────

  handleCanvasDblClick(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;

    const clickedId = nodeEl.id;
    if (!this.linkStartId) {
      this.linkStartId = clickedId;
      nodeEl.classList.add('selected');
      return;
    }
    if (this.linkStartId === clickedId) {
      nodeEl.classList.remove('selected');
      this.linkStartId = null;
      return;
    }

    const edgeId = `e${Date.now()}`;
    this.chart.addEdge({ id: edgeId, sourceId: this.linkStartId, targetId: clickedId });
    this.service.save(this.chart);

    // clear start highlight
    const startEl = document.getElementById(this.linkStartId);
    if (startEl) startEl.classList.remove('selected');
    this.linkStartId = null;

    this._renderAll();
  }

  // ─── Node dragging ─────────────────────────────────

  handleNodeMove(id, x, y) {
    const node = this.chart.nodes.find(n => n.id === id);
    node.x = x; node.y = y;
    this.service.save(this.chart);
    this.canvas.renderEdges(this.chart.edges, this._nodeMap());
  }

  // ─── Edge interactions ─────────────────────────────

  handleEdgeClick(edgeId) {
    const edge = this.chart.edges.find(e => e.id === edgeId);
    if (!edge) return;
    edge.style =
      edge.style === 'normal' ? 'dotted'
        : edge.style === 'dotted' ? 'reversed'
          : 'normal';
    this.service.save(this.chart);
    this._renderAll();
  }

  handleEdgeDblClick(edgeId) {
    this.chart.edges = this.chart.edges.filter(e => e.id !== edgeId);
    this.service.save(this.chart);
    this._renderAll();
  }

  // ─── Toolbar actions ───────────────────────────────

  add(type) {
    const id = `n${Date.now()}`;
    this.chart.addNode({ id, type, title: type === 'TASK' ? 'New Task' : 'Distr.' });
    this.service.save(this.chart);
    this._renderAll();
  }

  clearAll() {
    this.chart = new Flowchart();
    this.service.save(this.chart);
    this.selectedNodeId = null;
    this._renderAll();
  }

  // ─── Rendering helpers ─────────────────────────────

  _renderAll() {
    this.canvas.renderNodes(this.chart.nodes);
    this.canvas.renderEdges(this.chart.edges, this._nodeMap());
  }

  _nodeMap() {
    return this.chart.nodes.reduce((map, node) => {
      map[node.id] = document.getElementById(node.id);
      return map;
    }, {});
  }
}