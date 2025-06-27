// src/controllers/FlowController.js
import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas from '../ui/FlowCanvas.js';

export default class FlowController {
  constructor() {
    this.service = new StorageService();
    this.canvas = new FlowCanvas('#canvas', this.handleNodeMove.bind(this));
    this.chart = new Flowchart();
  }

  init() {
    // Load existing chart
    const saved = this.service.load();
    if (saved) {
      this.chart = Flowchart.fromJSON(saved);
    }

    this._renderAll();

    // Wire buttons
    document.getElementById('add-task').onclick = () => this.add('TASK');
    document.getElementById('add-dist').onclick = () => this.add('DISTRACTION');
    document.getElementById('clear-all').onclick = () => this.clearAll(); // NEW
  }

  handleNodeMove(id, x, y) {
    const node = this.chart.nodes.find(n => n.id === id);
    node.x = x;
    node.y = y;
    this.service.save(this.chart);
  }

  add(type) {
    const id = `n${Date.now()}`;
    this.chart.addNode({
      id,
      type,
      title: type === 'TASK' ? 'New Task' : 'Distr.'
    });
    this.service.save(this.chart);
    this._renderAll();
  }

  clearAll() {
    // reset model
    this.chart = new Flowchart();
    // clear storage
    this.service.save(this.chart);
    // re-render empty canvas
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