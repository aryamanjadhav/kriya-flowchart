// src/models/Node.js

export default class Node {
  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {'TASK'|'DISTRACTION'} opts.type
   * @param {number} [opts.x=0]
   * @param {number} [opts.y=0]
   * @param {string} [opts.status='TODO']              // for TASK
   * @param {number|null} [opts.distractionType=null]   // for DISTRACTION
   * @param {string} [opts.title='']
   * @param {number} [opts.xp=0]                        // new: experience points
   * @param {string} [opts.deadline='']                 // new: ISO date string
   * @param {string|null} [opts.completedTime=null]     // new: ISO datetime when marked COMPLETE
   */
  constructor({
    id,
    type,
    x = 0,
    y = 0,
    status = 'TODO',
    distractionType = null,
    title = '',
    xp = 0,
    deadline = '',
    completedTime = null
  }) {
    this.id            = id;
    this.type          = type;
    this.x             = x;
    this.y             = y;
    this.status        = status;
    this.distractionType = distractionType;
    this.title         = title;
    this.xp            = xp;
    this.deadline      = deadline;
    this.completedTime = completedTime;
  }

  /**
   * Cycle through TODO → IN_PROGRESS → COMPLETE.
   * Automatically stamps `completedTime` when entering COMPLETE,
   * and clears it if moving out of COMPLETE.
   */
  cycleStatus() {
    const states = ['todo', 'in-progress', 'done'];
    const idx    = states.indexOf(this.status);
    const next   = states[(idx + 1) % states.length];
    this.status = next;

    if (next === 'done') {
      this.completedTime = new Date().toISOString();
    } else {
      this.completedTime = null;
    }
  }

  toJSON() {
    // Always persist position & title
    const out = {
      id:    this.id,
      type:  this.type,
      x:     this.x,
      y:     this.y,
      title: this.title
    };

    if (this.type === 'TASK') {
      Object.assign(out, {
        status:        this.status,
        xp:            this.xp,
        deadline:      this.deadline,
        completedTime: this.completedTime
      });
    } else if (this.type === 'DISTRACTION') {
      out.distractionType = this.distractionType;
    }

    return out;
  }

  static fromJSON(obj) {
    return new Node({
      id:              obj.id,
      type:            obj.type,
      x:               obj.x,
      y:               obj.y,
      title:           obj.title,
      status:          obj.status,
      distractionType: obj.distractionType,
      xp:              obj.xp,
      deadline:        obj.deadline,
      completedTime:   obj.completedTime
    });
  }
}