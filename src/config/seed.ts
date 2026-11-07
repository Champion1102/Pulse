import type { Container } from './container';

/** Sample content for a brand-new workspace so the instructor can run a quiz in under a minute. */
export function seedSampleContent(c: Container, ws: string): { quizId: string } {
  const course = c.bank.createCourse(ws, 'SESD (System Design)');
  const patterns = c.bank.createUnit(ws, course.id, 'Design Patterns');
  const solid = c.bank.createUnit(ws, course.id, 'SOLID Principles');
  const creational = c.bank.createTopic(ws, patterns.id, 'Creational patterns');
  const behavioural = c.bank.createTopic(ws, patterns.id, 'Behavioural patterns');
  const lsp = c.bank.createTopic(ws, solid.id, 'Liskov & Interface Segregation');
  const dip = c.bank.createTopic(ws, solid.id, 'Dependency Inversion');

  const add = (spec: Parameters<typeof c.bank.addQuestion>[1]) => c.bank.addQuestion(ws, spec).id!;
  const ids = [
    add({
      type: 'mcq',
      topicId: creational.id,
      prompt: 'Which pattern creates the right question class from one "add question" request?',
      options: [{ text: 'Observer' }, { text: 'Factory', correct: true }, { text: 'Adapter' }, { text: 'Composite' }],
    }),
    add({
      type: 'true_false',
      topicId: creational.id,
      prompt: 'A Singleton room registry keeps working unchanged when you add a second server.',
      answer: false,
    }),
    add({
      type: 'multi_select',
      topicId: behavioural.id,
      prompt: 'Which of these are behavioural patterns?',
      options: [
        { text: 'Strategy', correct: true },
        { text: 'Observer', correct: true },
        { text: 'Template Method', correct: true },
        { text: 'Adapter' },
      ],
    }),
    add({
      type: 'mcq',
      topicId: lsp.id,
      prompt: 'Why does a poll question NOT implement Gradable?',
      options: [
        { text: 'Polls are rendered differently' },
        { text: 'A poll has no correct answer to grade', correct: true },
        { text: 'To save memory' },
      ],
    }),
    add({
      type: 'numeric',
      topicId: dip.id,
      prompt: 'How many scoring strategies ship with Pulse by default?',
      numericAnswer: 3,
    }),
    add({
      type: 'poll',
      topicId: dip.id,
      prompt: 'How confident do you feel about SOLID now?',
      options: [{ text: 'Very' }, { text: 'Somewhat' }, { text: 'Not yet' }],
    }),
  ];

  const quiz = c.quizzes.create(ws, 'SESD warm-up', ids);
  return { quizId: quiz.id };
}
