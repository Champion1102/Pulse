import { Check, Copy, SignOut } from '@phosphor-icons/react';
import { FormEvent, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, Field, Input, Panel } from '../../components/ui';
import { api } from '../../lib/api';
import { useCopy, useMeta } from '../../lib/hooks';
import { forgetWorkspace, saveWorkspace, workspaceLink } from '../../lib/workspace';
import type { AppContext } from './AppShell';

export default function Settings() {
  const { workspace, setWorkspace } = useOutletContext<AppContext>();
  const toast = useToast();
  const navigate = useNavigate();
  const meta = useMeta();
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
      toast('Saved');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-4xl font-bold tracking-tighter">Settings</h1>
      <Panel>
        <form onSubmit={rename} className="grid gap-4">
          <Field label="Classroom name">{(id) => <Input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}</Field>
          <Button type="submit" variant="ink" className="justify-self-start" disabled={!name.trim() || name === workspace.name}>Save</Button>
        </form>
      </Panel>
      <Panel className="grid gap-4">
        <h2 className="text-xl font-bold tracking-tight">Private link</h2>
        <p className="text-ink-2">Open this on another laptop to get the same workspace. Share it only with co-instructors you trust.</p>
        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-paper-2 p-2 pl-4">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">{link}</code>
          <Button size="sm" variant="ink" icon={copied ? <Check weight="bold" /> : <Copy weight="bold" />} onClick={() => copy(link)}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </Panel>
      <Panel className="grid gap-4">
        <h2 className="text-xl font-bold tracking-tight">This device</h2>
        <p className="text-ink-2">Forgetting removes the workspace from this browser only. Your quizzes stay safe as long as you still have the link.</p>
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
      </Panel>
      {meta && <p className="text-xs text-ink-2">Storage: {meta.storage === 'memory' ? 'in memory (resets when the server restarts)' : meta.storage} · AI drafts: {meta.aiProvider}</p>}
    </div>
  );
}
