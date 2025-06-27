export default class Node {
    constructor({ id, type, x=0, y=0, status='TODO', distractionType=null, title='' }) {
      this.id = id;
      this.type = type;         // 'TASK' or 'DISTRACTION'
      this.x = x; this.y = y;
      this.status = status;     // for TASK nodes
      this.distractionType = distractionType;
      this.title = title;
    }
  
    cycleStatus() {
      const states = ['TODO','IN_PROGRESS','COMPLETE'];
      this.status = states[(states.indexOf(this.status)+1)%states.length];
    }
  
    toJSON() {
      return { ...this };
    }
  
    static fromJSON(obj) {
      return new Node(obj);
    }
  }