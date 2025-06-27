// src/models/Node.js

export default class Node {
  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {'TASK'|'DISTRACTION'} opts.type
   * @param {number} [opts.x=0]
   * @param {number} [opts.y=0]
   * @param {string} [opts.status='TODO']          // for TASK
   * @param {number|null} [opts.distractionType=null] // for DISTRACTION, index into your 8‐color array
   * @param {string} [opts.title='']
   */
  constructor({ id, type, x = 0, y = 0, status = 'TODO', distractionType = null, title = '' }) {
    this.id = id;
    this.type = type;         // 'TASK' or 'DISTRACTION'
    this.x = x;
    this.y = y;
    this.status = status;       // cycles through TODO → IN_PROGRESS → COMPLETE
    this.distractionType = distractionType;
    this.title = title;
  }

  cycleStatus() {
    const states = ['TODO', 'IN_PROGRESS', 'COMPLETE'];
    this.status = states[(states.indexOf(this.status) + 1) % states.length];
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      // only include status on TASK nodes
      ...(this.type === 'TASK' && { status: this.status }),
      // only include distractionType on DISTRACTION nodes
      ...(this.type === 'DISTRACTION' && { distractionType: this.distractionType }),
      // always include position so it persists
      x: this.x,
      y: this.y
    };
  }

  static fromJSON(obj) {
    // JSON may have { id, type, title, status?, distractionType?, x, y }
    return new Node({
      id: obj.id,
      type: obj.type,
      title: obj.title,
      status: obj.status,
      distractionType: obj.distractionType,
      x: obj.x,
      y: obj.y
    });
  }
}