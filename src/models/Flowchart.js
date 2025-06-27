import Node from './Node.js';
import Edge from './Edge.js';

export default class Flowchart {
  constructor({ title = 'My Flowchart', nodes = [], edges = [] } = {}) {
    this.title = title;
    this.nodes = nodes.map(Node.fromJSON);
    this.edges = edges.map(Edge.fromJSON);
  }

  addNode({ id, type, title }) {
    // Construct initial properties for each node
    const payload = {
      id,
      type,
      title,
      // default position at (0,0)
      x: 0,
      y: 0,
      // TASK nodes start with a 'TODO' status, DISTRACTION nodes with type 0
      ...(type === 'TASK' ? { status: 'TODO' } : {}),
      ...(type === 'DISTRACTION' ? { distractionType: 0 } : {})
    };
    this.nodes.push(new Node(payload));
  }

  addEdge(props) {
    const e = new Edge({ style: 'normal', ...props });
    this.edges.push(e);
    return e;
  }

  toJSON() {
    return {
      title: this.title,
      // Node and Edge instances handle their own serialization
      nodes: this.nodes.map(n => n.toJSON()),
      edges: this.edges.map(e => e.toJSON())
    };
  }

  static fromJSON(obj) {
    return new Flowchart(obj);
  }
}