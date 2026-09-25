import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles/global.css';

const rootElement = document.getElementById('app');
if (rootElement) {
  render(<App />, rootElement);
}

registerSW({ immediate: true });
