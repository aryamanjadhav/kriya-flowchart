// src/controllers/FlowController.js

import Flowchart from '../models/Flowchart.js';
import StorageService from '../services/StorageService.js';
import FlowCanvas, { DIST_COLORS } from '../ui/FlowCanvas.js';

const DIST_COUNT = DIST_COLORS.length;

export default class FlowController {
  constructor() {
    this.service = new StorageService();
    this.chart = new Flowchart();
    this.linkStartId = null;
    this.selectedNodeId = null;

    // Initialize the canvas (must match your HTML #canvas)
    this.canvas = new FlowCanvas(
      '#canvas',
      this.handleNodeMove.bind(this),
      this.handleNodeTextChange.bind(this),
      this.handleNodeStatusChange.bind(this),
      this.handleNodeDistTypeChange.bind(this),
      this.handleEdgeClick.bind(this),
      this.handleEdgeDblClick.bind(this)
    );

    // Global key handler
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  init() {
    // Load from LocalStorage or start fresh
    const saved = this.service.load();
    if (saved) {
      this.chart = Flowchart.fromJSON(saved);
      // back-compat: ensure every task has a status
      this.chart.nodes.forEach(n => {
        if (n.type === 'TASK' && !n.status) n.status = 'todo';
      });
    }

    // Render chart title
    document.getElementById('chart-title').innerText = this.chart.title;
    // Render canvas
    this._renderAll();

    // Toolbar buttons
    document.getElementById('add-task').onclick = () => this.add('TASK');
    document.getElementById('add-dist').onclick = () => this.add('DISTRACTION');
    document.getElementById('clear-all').onclick = () => this.clearAll();
    document.getElementById('download-chart').onclick = () => this.exportChart();
    document.getElementById('upload-chart').onclick = () =>
      document.getElementById('file-input').click();

    // File-picker for upload
    document.getElementById('file-input').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) this.importChart(f);
      e.target.value = '';
    });

    // Title editing
    const titleEl = document.getElementById('chart-title');
    titleEl.addEventListener('blur', () => {
      this.handleTitleChange(titleEl.innerText.trim());
    });
    titleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });

    // Double‐click for linking
    this.canvas.container.addEventListener(
      'dblclick',
      this.handleCanvasDblClick.bind(this)
    );
  }

  // ── Export / Download ───────────────────────────────
  exportChart() {
    // 1) serialize
    const dataStr = JSON.stringify(this.chart.toJSON(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 2) sanitize title for use as filename
    const rawTitle = this.chart.title || 'flowchart';
    const safeTitle = rawTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_\s]/g, '')  // strip invalid chars
      .replace(/\s+/g, '-')            // spaces → dashes
      .substring(0, 50)                // limit length
      || 'flowchart';

    // 3) trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importChart(file) {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        // 1. Parse the uploaded JSON
        const data = JSON.parse(event.target.result);
        // 2. Rehydrate the chart (including its title, nodes, edges)
        this.chart = Flowchart.fromJSON(data);
        // 3. Persist to LocalStorage
        this.service.save(this.chart);
        // 4. Update the page’s title element
        const titleEl = document.getElementById('chart-title');
        titleEl.innerText = this.chart.title;
        // 5. Redraw everything on the canvas
        this._renderAll();
      } catch (err) {
        alert('Could not load flowchart: invalid file format.');
      }
    };
    // Trigger reading the selected file as text
    reader.readAsText(file);
  }

  // ── Title change handler ────────────────────────────
  handleTitleChange(newTitle) {
    this.chart.title = newTitle || 'Untitled';
    this.service.save(this.chart);
  }

  // ── Distraction‐bar click ───────────────────────────
  handleNodeDistTypeChange(nodeId) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.distractionType = ((node.distractionType || 0) + 1) % DIST_COUNT;
    this.service.save(this.chart);
    this._renderAll();
  }

  // ── Double‐click linking ─────────────────────────────
  handleCanvasDblClick(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;
    const id = nodeEl.id;

    // Select on dbl‐click
    this.handleNodeSelect(id);

    // Link flowchart logic
    if (!this.linkStartId) {
      this.linkStartId = id;
    } else if (this.linkStartId === id) {
      this.linkStartId = null; // cancel
    } else {
      const edgeId = `e${Date.now()}`;
      this.chart.addEdge({ id: edgeId, sourceId: this.linkStartId, targetId: id });
      this.service.save(this.chart);
      this.linkStartId = null;
      this._renderAll();
    }
  }

  // ── Select / Deselect nodes ─────────────────────────
  handleNodeSelect(id) {
    if (this.selectedNodeId) {
      document.getElementById(this.selectedNodeId)?.classList.remove('selected');
    }
    this.selectedNodeId = id;
    document.getElementById(id)?.classList.add('selected');
  }
  handleNodeDeselect() {
    if (!this.selectedNodeId) return;
    document.getElementById(this.selectedNodeId)?.classList.remove('selected');
    this.selectedNodeId = null;
  }

  // ── Keyboard shortcuts ──────────────────────────────
  handleKeyDown(e) {
    // Ctrl+Shift+T → new task
    if (e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault(); this.add('TASK'); return;
    }
    // Meta+D → new distraction
    if (e.metaKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault(); this.add('DISTRACTION'); return;
    }
    // Alt + Delete/Backspace → delete selected
    if (e.altKey && !e.ctrlKey && !e.metaKey &&
      (e.key === 'Delete' || e.key === 'Backspace') &&
      this.selectedNodeId) {
      e.preventDefault(); this.deleteNode(this.selectedNodeId); return;
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

  // ── Node content handlers ───────────────────────────
  handleNodeTextChange(nodeId, text) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    node.title = text || 'Untitled';
    this.service.save(this.chart);
  }

  handleNodeStatusChange(nodeId) {
    const node = this.chart.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const order = ['todo', 'in-progress', 'done'];
    const idx = order.indexOf(node.status || 'todo');
    node.status = order[(idx + 1) % order.length];
    this.service.save(this.chart);
    this._renderAll();
  }

  handleNodeMove(id, x, y) {
    const node = this.chart.nodes.find(n => n.id === id);
    node.x = x; node.y = y;
    this.service.save(this.chart);
    this.canvas.renderEdges(this.chart.edges, this._nodeMap());
  }

  handleEdgeClick(edgeId) {
    const edge = this.chart.edges.find(e => e.id === edgeId);
    edge.style = edge.style === 'normal' ? 'dotted'
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

  _renderAll() {
    this.canvas.renderNodes(this.chart.nodes);
    this.canvas.renderEdges(this.chart.edges, this._nodeMap());
  }

  _nodeMap() {
    return this.chart.nodes.reduce((map, n) => {
      map[n.id] = document.getElementById(n.id);
      return map;
    }, {});
  }
}