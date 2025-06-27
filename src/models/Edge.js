export default class Edge {
    constructor({ id, sourceId, targetId }) {
      this.id = id;
      this.sourceId = sourceId;
      this.targetId = targetId;
    }
    toJSON() { return { ...this }; }
    static fromJSON(o) { return new Edge(o); }
  }