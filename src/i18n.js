import { english } from './translations.js';

export function chooseLanguage(saved, browser = 'en') {
  return ['en', 'fr'].includes(saved) ? saved : browser.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
let saved;
try { saved = globalThis.localStorage?.getItem('wiki-link-count-language'); } catch {}
const requested = typeof window === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
export const language = typeof window === 'undefined' ? 'fr' : chooseLanguage(['en', 'fr'].includes(requested) ? requested : saved, navigator.language);
export const locale = language === 'fr' ? 'fr-FR' : 'en-GB';

// Only application-owned messages are translated. Source excerpts and titles remain untouched.
export function t(message, ...values) {
  const key = Array.isArray(message)
    ? message.reduce((out, part, i) => out + (i ? `{${i - 1}}` : '') + part, '')
    : message;
  const translated = language === 'en' ? (english[key] ?? key) : key;
  return values.length ? translated.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)])) : translated;
}

export function initLanguage() {
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement?.closest('script, style, #language')) continue;
    const key = node.textContent.replace(/\s+/g, ' ').trim();
    if (Object.hasOwn(english, key)) node.textContent = node.textContent.replace(/\S[\s\S]*\S|\S/, t(key));
  }
  for (const node of document.querySelectorAll('[aria-label]')) {
    node.setAttribute('aria-label', t(node.getAttribute('aria-label')));
  }
  const select = document.querySelector('#language');
  select.value = language;
  select.onchange = () => {
    try {
      localStorage.setItem('wiki-link-count-language', select.value);
      sessionStorage.setItem('wiki-link-count-form', JSON.stringify({
        query: document.querySelector('#query').value,
        mode: document.querySelector('input[name="mode"]:checked').value,
        scope: document.querySelector('#scope').value,
      }));
    } catch {}
    // Reloading keeps templates and newly generated results in the same language.
    const url = new URL(location.href);
    url.searchParams.set('lang', select.value);
    location.assign(url.href);
  };
}

export function restoreForm() {
  try {
    const state = JSON.parse(sessionStorage.getItem('wiki-link-count-form') || 'null');
    sessionStorage.removeItem('wiki-link-count-form');
    if (!state) return;
    document.querySelector('#query').value = state.query;
    if (['domain', 'url'].includes(state.mode)) document.querySelector(`input[value="${state.mode}"]`).checked = true;
    document.querySelector('#scope').value = state.scope;
  } catch {}
}
