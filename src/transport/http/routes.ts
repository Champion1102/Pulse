import express, { NextFunction, Request, Response, Router } from 'express';
import { networkInterfaces } from 'os';
import type { Container } from '../../config/container';
import { seedSampleContent } from '../../config/seed';
import { TopicLevel } from '../../domain/bank/TopicComponent';
import { Workspace } from '../../application/ports';

declare module 'express-serve-static-core' {
  interface Request {
    workspace?: Workspace;
  }
}

const WS_HEADER = 'x-workspace-key';

/** Tiny fixed-window rate limiter (per IP) for unauthenticated creation endpoints. */
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.reset < now) hits.set(ip, { n: 1, reset: now + windowMs });
    else if (++h.n > max) {
      res.status(429).json({ error: 'Too many requests, try again later' });
      return;
    }
    next();
  };
}

/** REST API. Students never call it; they only use the Socket.IO channel. */
export function apiRouter(c: Container): Router {
  const r = express.Router();
  const ws = (req: Request) => req.workspace!.id;
  const q = (v: unknown) => (typeof v === 'string' ? v : undefined);

  // ---- public --------------------------------------------------------------
  r.get('/meta', (req, res) => {
    res.json({
      joinOrigin: joinOrigin(req),
      questionTypes: c.bank.supportedTypes(),
      scoringModes: c.scoring.list().map(({ id, label, description }) => ({ id, label, description })),
      importFormats: c.bank.importFormats(),
      exportFormats: c.exporters.formats(),
      aiProvider: c.drafts.providerName,
      storage: c.store.name,
    });
  });

  /** Lets the join screen check a code before asking for a nickname. */
  r.get('/rooms/:code', (req, res) => {
    try {
      const s = c.live.snapshot(req.params.code);
      res.json({ code: s.code, quizTitle: s.quizTitle, state: s.state, players: s.players.filter((p) => p.connected).length });
    } catch {
      res.status(404).json({ error: 'No live quiz with that code' });
    }
  });

  r.post('/workspaces', rateLimit(20, 60 * 60 * 1000), (req, res) => {
    const created = c.workspaces.create(req.body?.name);
    if (req.body?.sample !== false) seedSampleContent(c, created.id);
    res.status(201).json(created);
  });

  // ---- instructor (workspace key required) --------------------------------
  r.use((req, _res, next) => {
    req.workspace = c.workspaces.authenticate(req.header(WS_HEADER));
    next();
  });

  r.get('/workspace', (req, res) => res.json({ id: req.workspace!.id, name: req.workspace!.name }));
  r.patch('/workspace', (req, res) => {
    const w = c.workspaces.rename(req.workspace!, req.body?.name);
    res.json({ id: w.id, name: w.name });
  });

  // question bank (Composite tree + Factory)
  r.get('/bank/tree', (req, res) => res.json(c.bank.tree(ws(req))));
  r.post('/bank/courses', (req, res) => res.status(201).json(c.bank.createCourse(ws(req), req.body?.name)));
  r.post('/bank/courses/:id/units', (req, res) => res.status(201).json(c.bank.createUnit(ws(req), req.params.id, req.body?.name)));
  r.post('/bank/units/:id/topics', (req, res) => res.status(201).json(c.bank.createTopic(ws(req), req.params.id, req.body?.name)));

  r.get('/questions', (req, res) => res.json(c.bank.listQuestions(ws(req), q(req.query.node))));
  r.post('/questions', (req, res) => res.status(201).json(c.bank.addQuestion(ws(req), req.body)));
  r.delete('/questions/:id', (req, res) => {
    c.bank.deleteQuestion(ws(req), req.params.id);
    res.status(204).end();
  });
  r.post('/questions/import', (req, res) => {
    const { format, content, topicId } = req.body ?? {};
    res.status(201).json(c.bank.importQuestions(ws(req), format, content, topicId));
  });

  // AI drafts
  r.get('/drafts', (req, res) => res.json(c.drafts.list(ws(req), q(req.query.status) as any)));
  r.post('/drafts/generate', rateLimit(30, 60 * 60 * 1000), async (req, res) => {
    const { notes, topicId, count, types } = req.body ?? {};
    res.status(201).json(await c.drafts.generate(ws(req), { notes, topicId, count, types }));
  });
  r.post('/drafts/:id/approve', (req, res) => res.json(c.drafts.approve(ws(req), req.params.id, req.body?.edits)));
  r.post('/drafts/:id/reject', (req, res) => res.json(c.drafts.reject(ws(req), req.params.id)));

  // quizzes
  r.get('/quizzes', (req, res) => res.json(c.quizzes.list(ws(req))));
  r.post('/quizzes', (req, res) => res.status(201).json(c.quizzes.create(ws(req), req.body?.title, req.body?.questionIds)));

  // sessions + reports
  r.post('/sessions', (req, res) =>
    res.status(201).json(c.live.start(ws(req), req.body?.quizId, req.body?.scoringMode ?? 'accuracy')),
  );
  r.get('/sessions', (req, res) => res.json(c.reports.listSessions(ws(req))));
  r.get('/sessions/:id/report', (req, res) =>
    res.json(c.reports.report(ws(req), req.params.id, (q(req.query.groupBy) as TopicLevel) ?? 'topic')),
  );
  r.get('/sessions/:id/export', (req, res) => {
    const file = c.reports.export(ws(req), req.params.id, q(req.query.format) ?? 'csv', (q(req.query.groupBy) as TopicLevel) ?? 'topic');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.body);
  });

  return r;
}

/**
 * Where phones should go to join. PUBLIC_URL wins (deployed). When the host
 * screen is opened on localhost, phones can't reach that, so use the LAN IP.
 */
function joinOrigin(req: Request): string | null {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.get('host') ?? '';
  if (!/^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return null;
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  const port = host.split(':')[1];
  return lan ? `${req.protocol}://${lan}${port ? `:${port}` : ''}` : null;
}

export function errorHandler(err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? (err instanceof SyntaxError ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}
