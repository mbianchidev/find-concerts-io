export type Theme = 'dark' | 'light';

export const THEME_KEY = 'find-concerts-theme';
export const THEME_EVENT = 'concerts-theme-changed';
export const THEME_COLORS = { dark: '#111824', light: '#f5f6f2' };

export const THEME_SCRIPT = `(() => {
  let theme = 'dark';
  try {
    if (localStorage.getItem(${JSON.stringify(THEME_KEY)}) === 'light') theme = 'light';
  } catch {
    console.warn('Theme preference could not be read; using dark mode.');
  }
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = ${JSON.stringify(THEME_COLORS)}[theme];
})();`;

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (meta) meta.content = THEME_COLORS[theme];
}
