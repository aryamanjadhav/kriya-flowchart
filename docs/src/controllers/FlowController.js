// src/controllers/FlowController.js

import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas, { DIST_COLORS } from '../ui/FlowCanvas.js';

const DIST_COUNT = DIST_COLORS.length;

export default class FlowController {
  constructor() {
    this.service         = new StorageService();
    this.chart           = new Flowchart();
    this.linkStartId     = null;
    this.selectedNodeId  = null;
    this.showDistractions = true;

    this.canvas = new FlowCanvas(
      '#canvas',
      this.handleNodeMove.bind(this),
      this.handleNodeTextChange.bind(this),
      this.handleNodeStatusChange.bind(this),
      this.handleNodeDistTypeChange.bind(this),
      this.handleEdgeClick.bind(this),
      this.handleEdgeDblClick.bind(this)
    );

    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  init() {
    // Load saved chart (if any)
    const saved = this.service.load();
    if (saved) {
      this.chart = Flowchart.fromJSON(saved);
      this.chart.nodes.forEach(n => {
        if (n.type === 'TASK' && !n.status) n.status = 'todo';
      });
    }

    // Render title and canvas
    document.getElementById('chart-title').innerText = this.chart.title;
    this._renderAll();

    // Toolbar bindings
    document.getElementById('add-task').onclick       = () => this.add('TASK');
    document.getElementById('add-dist').onclick       = () => this.add('DISTRACTION');
    document.getElementById('clear-all').onclick      = () => this.clearAll();
    document.getElementById('download-chart').onclick = () => this.exportChart();
    document.getElementById('upload-chart').onclick   = () =>
      document.getElementById('file-input').click();

    document
      .getElementById('toggle-dist')
      .addEventListener('click', this.toggleDistractions.bind(this));

    // File upload
    document.getElementById('file-input').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) this.importChart(f);
      e.target.value = '';
    });

    // Title editing
    const titleEl = document.getElementById('chart-title');
    titleEl.addEventListener('blur', () =>
      this.handleTitleChange(titleEl.innerText.trim())
    );
    titleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });

    // Double‐click to link nodes
    this.canvas.container.addEventListener(
      'dblclick',
      this.handleCanvasDblClick.bind(this)
    );
  }

  // ── Hide/Show Distractions ─────────────────────────
  toggleDistractions() {
    this.showDistractions = !this.showDistractions;
    console.log('toggleDistractions ->', this.showDistractions);
  
    const btn = document.getElementById('toggle-dist');
    if (this.showDistractions) {
      btn.innerText = '( ͒•·̫|';   // shown state
      btn.title     = 'Hide distractions';
    } else {
      btn.innerText = '( ͒>·̫|';   // hidden state
      btn.title     = 'Show distractions';
    }
  
    this._renderAll();
  }

  // ── Export to JSON and download ────────────────────
  exportChart() {
    const jsonStr = JSON.stringify(this.chart.toJSON(), null, 2);
    const blob    = new Blob([jsonStr], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);

    const rawTitle  = this.chart.title || 'flowchart';
    const safeTitle = rawTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'flowchart';

    const a = document.createElement('a');
    a.href        = url;
    a.download    = `${safeTitle}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Import from uploaded JSON ──────────────────────
  importChart(file) {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        this.chart = Flowchart.fromJSON(data);
        this.service.save(this.chart);
        document.getElementById('chart-title').innerText = this.chart.title;
        this._renderAll();
      } catch {
        alert('Invalid flowchart file.');
      }
    };
    reader.readAsText(file);
  }

  // ── Title change handler ───────────────────────────
  handleTitleChange(newTitle) {
    this.chart.title = newTitle || 'Untitled';
    this.service.save(this.chart);
  }

  // ── Distraction‐bar click cycles type ──────────────
  handleNodeDistTypeChange(nodeId) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.distractionType =
      ((node.distractionType || 0) + 1) % DIST_COUNT;
    this.service.save(this.chart);
    this._renderAll();
  }

  // ── Double‐click to link nodes ─────────────────────
  handleCanvasDblClick(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;
    const id = nodeEl.id;

    this.handleNodeSelect(id);

    if (!this.linkStartId) {
      this.linkStartId = id;
    } else if (this.linkStartId === id) {
      this.linkStartId = null;
    } else {
      const edgeId = `e${Date.now()}`;
      this.chart.addEdge({
        id: edgeId,
        sourceId: this.linkStartId,
        targetId: id
      });
      this.service.save(this.chart);
      this.linkStartId = null;
      this._renderAll();
    }
  }

  // ── Node selection helpers ─────────────────────────
  handleNodeSelect(id) {
    if (this.selectedNodeId) {
      document.getElementById(this.selectedNodeId)
        .classList.remove('selected');
    }
    this.selectedNodeId = id;
    document.getElementById(id)?.classList.add('selected');
  }
  handleNodeDeselect() {
    if (!this.selectedNodeId) return;
    document.getElementById(this.selectedNodeId)
      .classList.remove('selected');
    this.selectedNodeId = null;
  }

  // ── Keyboard shortcuts ─────────────────────────────
  handleKeyDown(e) {
    if (
      e.ctrlKey && e.shiftKey &&
      !e.metaKey && !e.altKey &&
      e.key.toLowerCase() === 't'
    ) {
      e.preventDefault();
      this.add('TASK');
      return;
    }
    if (
      e.metaKey && !e.shiftKey && !e.altKey &&
      e.key.toLowerCase() === 'd'
    ) {
      e.preventDefault();
      this.add('DISTRACTION');
      return;
    }
    if (
      e.altKey && !e.ctrlKey && !e.metaKey &&
      (e.key === 'Delete' || e.key === 'Backspace') &&
      this.selectedNodeId
    ) {
      e.preventDefault();
      this.deleteNode(this.selectedNodeId);
    }
  }

  deleteNode(id) {
    this.chart.nodes = this.chart.nodes.filter(n => n.id !== id);
    this.chart.edges = this.chart.edges.filter(
      e => e.sourceId !== id && e.targetId !== id
    );
    this.service.save(this.chart);
    this.handleNodeDeselect();
    this._renderAll();
  }

  // ── Node text / status / move handlers ────────────
  handleNodeTextChange(nodeId, text) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.title = text || 'Untitled';
    this.service.save(this.chart);
  }

  handleNodeStatusChange(nodeId) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const states = ['todo', 'in-progress', 'done'];
    const idx    = states.indexOf(node.status || 'todo');
    node.status  = states[(idx + 1) % states.length];
    this.service.save(this.chart);
    this._renderAll();
  }

  handleNodeMove(id, x, y) {
    const node = this.chart.nodes.find(n => n.id === id);
    node.x = x; node.y = y;
    this.service.save(this.chart);
    this.canvas.renderEdges(
      this.chart.edges,
      this._nodeMap(this.chart.nodes)
    );
  }

  handleEdgeClick(edgeId) {
    const edge = this.chart.edges.find(e => e.id === edgeId);
    edge.style = edge.style === 'normal'
      ? 'dotted'
      : edge.style === 'dotted'
        ? 'reversed'
        : 'normal';
    this.service.save(this.chart);
    this._renderAll();
  }

  handleEdgeDblClick(edgeId) {
    this.chart.edges = this.chart.edges.filter(e => e.id !== edgeId);
    this.service.save(this.chart);
    this._renderAll();
  }

  // ── Add / Clear ───────────────────────────────────
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
    this.chart = new Flowchart();
    this.service.save(this.chart);
    this.handleNodeDeselect();
    this._renderAll();
  }

  // ── Render nodes & edges (with optional filtering) ─
  _renderAll() {
    const nodes = this.showDistractions
      ? this.chart.nodes
      : this.chart.nodes.filter(n => n.type !== 'DISTRACTION');

    const vis = new Set(nodes.map(n => n.id));
    const edges = this.chart.edges.filter(
      e => vis.has(e.sourceId) && vis.has(e.targetId)
    );

    this.canvas.renderNodes(nodes);
    this.canvas.renderEdges(edges, this._nodeMap(nodes));
  }

  _nodeMap(nodes) {
    return nodes.reduce((map, n) => {
      map[n.id] = document.getElementById(n.id);
      return map;
    }, {});
  }
}