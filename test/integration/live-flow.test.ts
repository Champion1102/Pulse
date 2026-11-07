import { expect } from 'chai';
import { AddressInfo } from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { createApp, PulseApp } from '../../src/app';
import { OfflineQuestionGenerator } from '../../src/ai/OfflineQuestionGenerator';
import { RoomRegistry } from '../../src/domain/session';

type Ack = { ok: boolean; error?: string; [k: string]: any };
const emit = (s: Socket, ev: string, msg: unknown = {}) => new Promise<Ack>((res) => s.emit(ev, msg, res));
const once = <T = any>(s: Socket, ev: string) => new Promise<T>((res) => s.once(ev, res));

describe('Live flow over HTTP + Socket.IO (integration)', function () {
  let app: PulseApp;
  let base: string;
  let quizId: string;
  let key: string;
  const sockets: Socket[] = [];

  before(async () => {
    RoomRegistry.resetForTests();
    app = createApp({ generator: new OfflineQuestionGenerator(), rooms: RoomRegistry.getInstance() });
    await new Promise<void>((r) => app.http.listen(0, r));
    base = `http://localhost:${(app.http.address() as AddressInfo).port}`;
    const created = await api('/api/workspaces', { method: 'POST', body: { name: 'Test class' } });
    key = created.body.key;
    quizId = (await api('/api/quizzes')).body[0].id;
  });

  after(async () => {
    sockets.forEach((s) => s.close());
    app.io.close();
    await new Promise((r) => app.http.close(r));
  });

  const client = () => {
    const s = connect(base, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    return s;
  };

  const api = async (path: string, init?: { method?: string; body?: unknown }) => {
    const res = await fetch(base + path, {
      method: init?.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(key ? { 'x-workspace-key': key } : {}) },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
  };

  it('create quiz -> join room -> answer -> leaderboard -> report -> export', async () => {
    const meta = await api('/api/meta');
    expect(meta.body.scoringModes).to.have.length(3);

    const started = await api('/api/sessions', { method: 'POST', body: { quizId, scoringMode: 'speed' } });
    expect(started.status).to.equal(201);
    const { code, hostKey, sessionId } = started.body;

    const host = client();
    expect((await emit(host, 'host:attach', { code, hostKey })).ok).to.equal(true);
    expect((await emit(client(), 'host:attach', { code, hostKey: 'wrong' })).ok).to.equal(false);

    const ann = client();
    const bob = client();
    const joinA = await emit(ann, 'player:join', { code: code.toLowerCase(), nickname: 'Ann' });
    const joinB = await emit(bob, 'player:join', { code, nickname: 'Bob' });
    expect(joinA.ok && joinB.ok).to.equal(true);
    expect((await emit(client(), 'player:join', { code, nickname: 'ann' })).error).to.match(/taken/);

    // students cannot drive the session
    expect((await emit(ann, 'host:next')).ok).to.equal(false);

    const started1 = once(ann, 'round:started');
    expect((await emit(host, 'host:next')).ok).to.equal(true);
    const round = await started1;
    expect(round.question.options).to.have.length(4);
    expect(JSON.stringify(round.question)).not.to.match(/correct/);

    const leaderboard = once(host, 'leaderboard');
    const annResult = once(ann, 'round:result');
    const annScore = once(ann, 'player:score');
    expect((await emit(ann, 'player:answer', { answer: { kind: 'choice', optionIds: ['b'] } })).ok).to.equal(true);
    expect((await emit(ann, 'player:answer', { answer: { kind: 'choice', optionIds: ['a'] } })).error).to.match(/Already/);
    await emit(bob, 'player:answer', { answer: { kind: 'choice', optionIds: ['a'] } });

    const lb = await leaderboard;
    expect(lb.entries[0].nickname).to.equal('Ann');
    expect(lb.entries[0].total).to.be.greaterThan(900);
    expect((await annResult).correct).to.equal(true);
    expect((await annScore).rank).to.equal(1);

    const ended = once(bob, 'session:ended');
    expect((await emit(host, 'host:end-session')).ok).to.equal(true);
    expect((await ended).leaderboard).to.have.length(2);

    const report = await api(`/api/sessions/${sessionId}/report`);
    expect(report.status).to.equal(200);
    expect(report.body.questions).to.have.length(1);
    expect(report.body.groups[0]).to.include({ answered: 2, correct: 1 });

    const byUnit = await api(`/api/sessions/${sessionId}/report?groupBy=unit`);
    expect(byUnit.body.groups[0].name).to.equal('Design Patterns');

    const csv = await api(`/api/sessions/${sessionId}/export?format=csv`);
    expect(csv.body).to.contain('rank,nickname,score');
  });

  it('isolates workspaces and rejects missing keys', async () => {
    const other = await api('/api/workspaces', { method: 'POST', body: { name: 'Other', sample: false } });
    const mine = key;
    key = other.body.key;
    expect((await api('/api/quizzes')).body).to.deep.equal([]);
    expect((await api('/api/sessions', { method: 'POST', body: { quizId } })).status).to.equal(404);
    key = '';
    expect((await api('/api/quizzes')).status).to.equal(403);
    key = mine;
    expect((await api('/api/rooms/NOPE99')).status).to.equal(404);
  });

  it('returns 4xx for bad input', async () => {
    expect((await api('/api/sessions', { method: 'POST', body: { quizId: 'nope' } })).status).to.equal(404);
    expect((await api('/api/sessions', { method: 'POST', body: { quizId, scoringMode: 'nope' } })).status).to.equal(400);
    expect((await api('/api/questions', { method: 'POST', body: { type: 'mcq', prompt: 'x', topicId: 'nope' } })).status).to.equal(400);
  });
});
