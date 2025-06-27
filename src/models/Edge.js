export default class Edge {
  constructor({ id, sourceId, targetId, style = 'normal' }) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.style = style;    // 'normal' | 'dotted' | 'reversed'
  }
  toJSON() { return { id: this.id, sourceId: this.sourceId, targetId: this.targetId, style: this.style }; }
  static fromJSON(o) { return new Edge(o); }
}