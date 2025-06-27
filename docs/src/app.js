import FlowController from './controllers/FlowController.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('App bootstrapping…');
  const ctrl = new FlowController();
  ctrl.init();
});