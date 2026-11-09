import { Link } from 'react-router';
import { Field, Select } from '../../components/ui';
import type { FlatTopic } from '../../lib/hooks';

export function TopicPicker({ topics, value, onChange, label = 'Topic' }: { topics: FlatTopic[] | null; value: string; onChange: (id: string) => void; label?: string }) {
  if (topics && topics.length === 0) {
    return (
      <p className="rounded-2xl bg-pulse-soft px-4 py-3 text-sm font-medium text-pulse">
        You need a topic first. <Link to="/app/library" className="underline">Create one in the question bank.</Link>
      </p>
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
