import { ipcRenderer } from 'electron';

// Runs inside the game webview before the page scripts.
// Listens for keydown events and forwards them to the embedder renderer
// via ipcRenderer.sendToHost, which fires an 'ipc-message' event on the
// <webview> element in the parent renderer.
document.addEventListener('keydown', (e) => {
  ipcRenderer.sendToHost('keydown', e.key);
}, true);

const mouseBindButtonMap: Record<number, string> = {
  1: 'middle',
  3: 'mouse4',
  4: 'mouse5'
};

function suppressMouseBindDefault(event: MouseEvent): void {
  if (!mouseBindButtonMap[event.button]) return;
  event.preventDefault();
  event.stopPropagation();
}

document.addEventListener('mousedown', (event) => {
  const key = mouseBindButtonMap[event.button];
  if (!key) return;

  suppressMouseBindDefault(event);
  ipcRenderer.sendToHost('mousebind', key);
}, true);

document.addEventListener('mouseup', suppressMouseBindDefault, true);
document.addEventListener('auxclick', suppressMouseBindDefault, true);
