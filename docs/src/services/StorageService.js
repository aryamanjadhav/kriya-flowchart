const KEY = 'kriya-flowchart';

export default class StorageService {
  save(flowchart) {
    localStorage.setItem(KEY, JSON.stringify(flowchart.toJSON()));
  }

  load() {
    const json = localStorage.getItem(KEY);
    return json ? JSON.parse(json) : null;
  }
}