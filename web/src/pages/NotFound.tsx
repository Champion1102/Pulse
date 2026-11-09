import { Link } from 'react-router';
import { Button, Logo } from '../components/ui';

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <div className="grid justify-items-start gap-5">
        <Logo />
        <h1 className="text-5xl font-bold tracking-tighter">Nothing here.</h1>
        <p className="text-ink-2">That page does not exist. Maybe the link was mistyped.</p>
        <Link to="/">
          <Button variant="ink">Back home</Button>
        </Link>
      </div>
    </main>
  );
}
