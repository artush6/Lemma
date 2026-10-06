import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Settings2, Palette, Type, FileText, Sigma, Download, Keyboard, Cloud, User, X, RotateCcw } from 'lucide-react';

export type Preferences = {
  startup: string; density: string; sidebarWidth: number; showIcons: boolean;
  font: string; size: number; lineHeight: number; spellcheck: boolean; slashCommands: boolean;
  margin: number; pageNumbers: boolean; boundaries: boolean; mathSize: number;
  graphLegend: boolean; printNumbers: boolean;
};
export const defaultPreferences: Preferences = {
  startup: 'workspace', density: 'comfortable', sidebarWidth: 244, showIcons: true,
  font: 'serif', size: 16, lineHeight: 1.65, spellcheck: true, slashCommands: true,
  margin: 20, pageNumbers: true, boundaries: true, mathSize: 1.15,
  graphLegend: true, printNumbers: false,
};
const tabs = [
  ['General', Settings2], ['Appearance', Palette], ['Editor', Type], ['Document', FileText],
  ['Mathematics', Sigma], ['Export', Download], ['Shortcuts', Keyboard], ['Sync', Cloud], ['Account', User],
] as const;

function Row({ title, children }: { title: string; children: ReactNode }) {
  return <div className="preference-row"><span>{title}</span><div>{children}</div></div>;
}
function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={value} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= min && n <= max) onChange(n); }} />;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <Button variant="ghost" className="preference-switch" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}><span /></Button>;
}
export function Settings({ open, onOpenChange, preferences: p, onChange, theme, onTheme, dark, email, saved, onSignOut }: {
  open: boolean; onOpenChange: (v: boolean) => void; preferences: Preferences; onChange: (p: Preferences) => void;
  theme: string; onTheme: (v: 'system' | 'light' | 'dark') => void; dark: boolean; email?: string; saved: string; onSignOut: () => void;
}) {
  const [tab, setTab] = useState('General');
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => onChange({ ...p, [key]: value });
  const toggle = (key: keyof Preferences, label: string) => <Toggle label={label} checked={Boolean(p[key])} onChange={v => onChange({ ...p, [key]: v })} />;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="preferences-overlay" />
    <Dialog.Content className={`preferences-dialog ${dark ? 'dark' : ''}`} style={{'--doc-font-family':p.font==='serif'?'KaTeX_Main, Georgia, serif':p.font==='mono'?'ui-monospace, monospace':'Inter, sans-serif','--doc-font-size':`${p.size}px`,'--doc-line-height':p.lineHeight} as React.CSSProperties} aria-describedby={undefined}>
      <header className="preferences-header"><Dialog.Title>Settings</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close settings"><X /></Button></Dialog.Close></header>
      <div className="preferences-layout"><nav aria-label="Settings categories">{tabs.map(([name, Icon]) => <Button variant="ghost" key={name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}><Icon />{name}</Button>)}</nav>
        <section className="preferences-content"><h2>{tab}</h2>
          {tab === 'General' && <><h3>Workspace</h3><Row title="Open Lemma to"><select aria-label="Startup screen" value={p.startup} onChange={e => set('startup', e.target.value)}><option value="workspace">All notes</option><option value="last">Last opened note</option></select></Row><Row title="Sidebar width"><NumberField label="Sidebar width" value={p.sidebarWidth} min={200} max={340} step={4} onChange={v => set('sidebarWidth', v)} /><small>px</small></Row><h3>Preferences</h3><Row title="Restore defaults"><Button variant="outline" size="sm" onClick={() => onChange({ ...defaultPreferences })}><RotateCcw />Reset preferences</Button></Row></>}
          {tab === 'Appearance' && <><h3>Theme</h3><div className="theme-choices">{(['system', 'light', 'dark'] as const).map(t => <Button key={t} variant="outline" aria-pressed={theme === t} className={`theme-choice theme-${t}`} onClick={() => onTheme(t)}><span className="theme-sample"><i /><i /><i /></span>{t.charAt(0).toUpperCase() + t.slice(1)}</Button>)}</div><h3>Navigation</h3><Row title="Interface density"><select aria-label="Interface density" value={p.density} onChange={e => set('density', e.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></Row><Row title="Show note icons">{toggle('showIcons', 'Show note icons')}</Row></>}
          {tab === 'Editor' && <><h3>Typography</h3><Row title="Document typeface"><select aria-label="Document typeface" value={p.font} onChange={e => set('font', e.target.value)}><option value="serif">Textbook · Computer Modern</option><option value="sans">Sans serif · Inter</option><option value="mono">Monospace</option></select></Row><Row title="Text size"><NumberField label="Text size" value={p.size} min={12} max={24} onChange={v => set('size', v)} /><small>px</small></Row><Row title="Line spacing"><NumberField label="Line spacing" value={p.lineHeight} min={1.2} max={2.4} step={0.05} onChange={v => set('lineHeight', v)} /></Row><div className="type-preview">The beauty of mathematics lies in its clarity.<br /><span className="katex">f(x) = x² + 1</span></div><h3>Writing</h3><Row title="Spell checking">{toggle('spellcheck', 'Spell checking')}</Row><Row title="Slash commands">{toggle('slashCommands', 'Slash commands')}</Row></>}
          {tab === 'Document' && <><h3>Page layout</h3><Row title="Paper size"><span>A4 · 210 × 297 mm</span></Row><Row title="Orientation"><span>Portrait</span></Row><Row title="Page margins"><NumberField label="Page margins" value={p.margin} min={10} max={30} onChange={v => set('margin', v)} /><small>mm</small></Row><h3>Canvas</h3><Row title="Show sheet boundaries">{toggle('boundaries', 'Show sheet boundaries')}</Row><Row title="Show page numbers">{toggle('pageNumbers', 'Show page numbers')}</Row></>}
          {tab === 'Mathematics' && <><h3>Equations</h3><Row title="Rendering"><span>KaTeX · Computer Modern</span></Row><Row title="Equation scale"><NumberField label="Equation scale" value={p.mathSize} min={0.8} max={1.6} step={0.05} onChange={v => set('mathSize', v)} /></Row><Row title="Inline delimiters"><code>$ … $</code></Row><Row title="Block delimiters"><code>$$ … $$</code></Row><h3>Graphs</h3><Row title="Legend on new graphs">{toggle('graphLegend', 'Legend on new graphs')}</Row></>}
          {tab === 'Export' && <><h3>PDF & printing</h3><Row title="Format"><span>A4 · portrait</span></Row><Row title="Include page numbers">{toggle('printNumbers', 'Include page numbers')}</Row><Row title="Note title, tags & toolbar"><span>Excluded</span></Row><Row title="Document headings"><span>Included</span></Row></>}
          {tab === 'Shortcuts' && <><h3>Writing</h3>{([['Bold', '⌘ / Ctrl B'], ['Italic', '⌘ / Ctrl I'], ['Inline equation', '⌘ / Ctrl M'], ['Block equation', '⌘ / Ctrl ⇧ E'], ['Search notes', '⌘ / Ctrl ⇧ P'], ['Focus mode', '⌘ / Ctrl ⇧ F'], ['Undo', '⌘ / Ctrl Z']] as const).map(([name, key]) => <Row key={name} title={name}><kbd>{key}</kbd></Row>)}</>}
          {tab === 'Sync' && <><h3>Saving</h3><Row title="Status"><span className="sync-status">{saved === 'saving' ? 'Saving changes…' : saved === 'offline' ? 'Saved on this device · cloud unavailable' : 'All changes saved'}</span></Row><Row title="Automatic saving"><span>Always on</span></Row><Row title="Local recovery"><span>Enabled</span></Row></>}
          {tab === 'Account' && <><h3>Your account</h3><Row title="Email"><span className="account-email">{email || 'Shared document'}</span></Row>{email && <Row title="Session"><Button variant="outline" size="sm" onClick={onSignOut}>Sign out</Button></Row>}</>}
        </section></div><footer className="preferences-footer"><span>Preferences saved on this device</span><Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Done</Button></footer>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}