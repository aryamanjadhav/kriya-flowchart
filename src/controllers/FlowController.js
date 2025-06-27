import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas from '../ui/FlowCanvas.js';

export default class FlowController {
  constructor() {
    this.service = new StorageService();
    this.canvas = new FlowCanvas('#canvas');
    this.chart = new Flowchart();
  }

  init() {
    // 1) load from storage
    const saved = this.service.load();
    if (saved) this.chart = Flowchart.fromJSON(saved);
    // 2) render initial
    this.canvas.renderNodes(this.chart.nodes);
    this.canvas.renderEdges(this.chart.edges);
    // 3) wire “+Task” / “+Dist” buttons
    document.getElementById('add-task').onclick = () => this.add('TASK');
    document.getElementById('add-dist').onclick = () => this.add('DISTRACTION');
  }

  add(type) {
    const id = `n${Date.now()}`;
    const node = this.chart.addNode({ id, type, title: type==='TASK'?'New Task':'Distr.' });
    this.service.save(this.chart);
    this.canvas.renderNodes(this.chart.nodes);
  }
}