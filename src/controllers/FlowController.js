// src/controllers/FlowController.js
import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas from '../ui/FlowCanvas.js';

export default class FlowController {
  constructor() {
    this.service = new StorageService();
    this.linkStartId = null; // track start of a new link
    this.canvas = new FlowCanvas(
      '#canvas',
      this.handleNodeMove.bind(this),
      this.handleEdgeClick.bind(this)
    );
    this.chart = new Flowchart();
  }

  init() {
    // Load from storage
    const saved = this.service.load();
    if (saved) this.chart = Flowchart.fromJSON(saved);

    this._renderAll();

    // Wire toolbar buttons
    document.getElementById('add-task').onclick = () => this.add('TASK');
    document.getElementById('add-dist').onclick = () => this.add('DISTRACTION');
    document.getElementById('clear-all').onclick = () => this.clearAll();

    // Listen for double-clicks to link nodes
    this.canvas.container.addEventListener('dblclick', this.handleCanvasDblClick.bind(this));
  }

  handleCanvasDblClick(e) {
    const nodeEl = e.target.closest('.node');
    console.log('dblclick:', { target: e.target, nodeEl });
    if (!nodeEl) return;

    const clickedId = nodeEl.id;
    console.log('  clickedId =', clickedId, 'linkStartId =', this.linkStartId);

    if (!this.linkStartId) {
      this.linkStartId = clickedId;
      nodeEl.classList.add('selected');
      console.log('  selected start node', this.linkStartId);
      return;
    }

    if (this.linkStartId === clickedId) {
      nodeEl.classList.remove('selected');
      console.log('  cancelled selection');
      this.linkStartId = null;
      return;
    }

    const edgeId = `e${Date.now()}`;
    console.log('  adding edge', this.linkStartId, '→', clickedId, 'as', edgeId);
    this.chart.addEdge({ id: edgeId, sourceId: this.linkStartId, targetId: clickedId });
    console.log('  edges now:', this.chart.edges);

    this.service.save(this.chart);
    const startEl = document.getElementById(this.linkStartId);
    if (startEl) startEl.classList.remove('selected');
    this.linkStartId = null;
    this._renderAll();
  }

  handleNodeMove(id, x, y) {
    const node = this.chart.nodes.find(n => n.id === id);
    node.x = x; node.y = y;
    this.service.save(this.chart);
    // redraw edges so they follow the moved node
    this.canvas.renderEdges(this.chart.edges, this._nodeMap());
  }

  handleEdgeClick(edgeId) {
    if (!confirm('Delete this connection?')) return;
    this.chart.edges = this.chart.edges.filter(e => e.id !== edgeId);
    this.service.save(this.chart);
    this._renderAll();
  }

  add(type) {
    const id = `n${Date.now()}`;
    this.chart.addNode({ id, type, title: type === 'TASK' ? 'New Task' : 'Distr.' });
    this.service.save(this.chart);
    this._renderAll();
  }

  clearAll() {
    this.chart = new Flowchart();
    this.service.save(this.chart);
    this._renderAll();
  }

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