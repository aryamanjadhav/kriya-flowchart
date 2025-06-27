import Node from './Node.js';
import Edge from './Edge.js';

export default class Flowchart {
  constructor({ nodes = [], edges = [] } = {}) {
    this.nodes = nodes.map(Node.fromJSON);
    this.edges = edges.map(Edge.fromJSON);
  }

  addNode(nodeProps) {
    const n = new Node(nodeProps);
    this.nodes.push(n);
    return n;
  }

  addEdge(edgeProps) {
    const e = new Edge(edgeProps);
    this.edges.push(e);
    return e;
  }

  toJSON() {
    return {
      nodes: this.nodes.map(n=>n.toJSON()),
      edges: this.edges.map(e=>e.toJSON())
    };
  }

  static fromJSON(obj) {
    return new Flowchart(obj);
  }
}