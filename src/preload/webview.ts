import { ipcRenderer } from 'electron';

// Runs inside the game webview before the page scripts.
// Listens for keydown events and forwards them to the embedder renderer
// via ipcRenderer.sendToHost, which fires an 'ipc-message' event on the
// <webview> element in the parent renderer.
document.addEventListener('keydown', (e) => {
  ipcRenderer.sendToHost('keydown', e.key);
}, true);
