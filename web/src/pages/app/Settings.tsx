import { Check, Copy, Database, Desktop, Moon, Sparkle, SignOut, Sun } from '@phosphor-icons/react';
import { FormEvent, ReactNode, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { useToast } from '../../components/Toast';
import { Avatar, Button, Chip, Input, PageHeader, Panel, Segmented, Switch } from '../../components/ui';
import { api } from '../../lib/api';
import { useCopy, useMeta } from '../../lib/hooks';
import { useSound } from '../../lib/sfx';
import { ThemePref, useTheme } from '../../lib/theme';
import { forgetWorkspace, saveWorkspace, workspaceLink } from '../../lib/workspace';
import type { AppContext } from './AppShell';

function Section({ title, description, children, danger }: { title: string; description?: string; children: ReactNode; danger?: boolean }) {
  return (
    <Panel className={danger ? '!border-bad/30' : undefined}>
      <div className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
        <div>
          <h2 className={`text-[15px] font-semibold tracking-[-0.01em] ${danger ? 'text-bad' : ''}`}>{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>}
        </div>
        <div className="grid min-w-0 content-start gap-4">{children}</div>
      </div>
    </Panel>
  );
}

export default function Settings() {
  const { workspace, setWorkspace } = useOutletContext<AppContext>();
  const toast = useToast();
  const navigate = useNavigate();
  const meta = useMeta();
  const { pref, setPref } = useTheme();
  const [sound, setSound] = useSound();
  const [name, setName] = useState(workspace.name);
  const [copied, copy] = useCopy();
  const link = workspaceLink(workspace.key);

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const w = await api<{ id: string; name: string }>('/workspace', { method: 'PATCH', body: { name } });
      const next = { ...workspace, name: w.name };
      saveWorkspace(next);
      setWorkspace(next);
      toast('Saved', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader eyebrow="Workspace" title="Settings" description="Your classroom, your link, and how Pulse looks and sounds on this device." />

      <Section title="Classroom" description="Shown on your workspace and reports.">
        <form onSubmit={rename} className="flex flex-wrap items-center gap-3">
          <Avatar name={name || workspace.name} size="lg" />
          <label htmlFor="ws-name" className="sr-only">Classroom name</label>
          <Input id="ws-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 basis-48" />
          <Button type="submit" variant="ink" disabled={!name.trim() || name === workspace.name}>Save</Button>
        </form>
      </Section>

      <Section title="Appearance" description="Saved in this browser.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">Theme</span>
          <Segmented<ThemePref>
            value={pref}
            onChange={setPref}
            options={[
              { value: 'system', label: 'System', icon: <Desktop weight="bold" /> },
              { value: 'light', label: 'Light', icon: <Sun weight="bold" /> },
              { value: 'dark', label: 'Dark', icon: <Moon weight="bold" /> },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-sm font-medium">Sound effects</p>
            <p className="text-[12.5px] text-ink-3">Subtle cues on the host screen and phones.</p>
          </div>
          <Switch checked={sound} onChange={setSound} label="Sound effects" />
        </div>
      </Section>

      <Section title="Private link" description="Open this on another laptop to get the same workspace. Share it only with co-instructors you trust.">
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-line bg-paper-2 p-1.5 pl-4">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-2">{link}</code>
          <Button size="sm" variant={copied ? 'soft' : 'ink'} icon={copied ? <Check weight="bold" className="text-good" /> : <Copy weight="bold" />} onClick={() => copy(link)}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </Section>

      {meta && (
        <Section title="Server" description="How this Pulse server is configured.">
          <div className="flex flex-wrap gap-2">
            <Chip><Database weight="bold" /> Storage: {meta.storage === 'memory' ? 'in memory (resets when the server restarts)' : meta.storage}</Chip>
            <Chip><Sparkle weight="bold" /> AI drafts: {meta.aiProvider}</Chip>
          </div>
        </Section>
      )}

      <Section danger title="This device" description="Forgetting removes the workspace from this browser only. Your quizzes stay safe as long as you still have the link.">
        <Button
          variant="danger"
          className="justify-self-start"
          icon={<SignOut weight="bold" />}
          onClick={() => {
            forgetWorkspace();
            setWorkspace(null);
            navigate('/');
          }}
        >
          Forget on this device
        </Button>
      </Section>
    </div>
  );
}
