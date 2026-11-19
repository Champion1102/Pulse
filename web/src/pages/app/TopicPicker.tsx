import { ArrowRight, Warning } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Field, Select } from '../../components/ui';
import type { FlatTopic } from '../../lib/hooks';

export function TopicPicker({ topics, value, onChange, label = 'Topic' }: { topics: FlatTopic[] | null; value: string; onChange: (id: string) => void; label?: string }) {
  if (topics && topics.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-pulse/20 bg-pulse-soft px-4 py-3 text-sm">
        <Warning weight="fill" className="mt-0.5 shrink-0 text-pulse" />
        <p className="text-ink">
          You need a topic first.{' '}
          <Link to="/app/library" className="inline-flex items-center gap-1 font-semibold text-pulse underline-offset-4 hover:underline">
            Create one in the question bank <ArrowRight weight="bold" size={12} />
          </Link>
        </p>
      </div>
    );
  }
  return (
    <Field label={label}>
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>Choose a topic</option>
          {topics?.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
        </Select>
      )}
    </Field>
  );
}
