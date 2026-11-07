import { expect } from 'chai';
import { CsvQuestionImporter } from '../../src/adapters/importers/CsvQuestionImporter';
import { GoogleFormsImporter } from '../../src/adapters/importers/GoogleFormsImporter';
import { CsvResultsExporter } from '../../src/adapters/exporters/CsvResultsExporter';
import { parseCsv } from '../../src/adapters/importers/csv';
import { factory } from '../support/helpers';

describe('Import adapters', () => {
  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,"b,c","d ""e"""\n1,2,3')).to.deep.equal([['a', 'b,c', 'd "e"'], ['1', '2', '3']]);
  });

  it('CSV importer produces specs the Factory accepts', () => {
    const csv = [
      'type,prompt,options,correct,time_limit',
      'mcq,"Which pattern swaps scoring?",Factory|Strategy|Adapter,2,15',
      'multi_select,Pick behavioural,Strategy|Adapter|Observer,1|3,',
      'true_false,Polls are gradable,,false,',
      'numeric,Pi to 2dp,,3.14±0.01,',
      'poll,Mood?,Good|Meh,,',
    ].join('\n');
    const specs = new CsvQuestionImporter().parse(csv);
    expect(specs.map((s) => s.type)).to.deep.equal(['mcq', 'multi_select', 'true_false', 'numeric', 'poll']);
    expect(specs[0].options![1]).to.deep.equal({ text: 'Strategy', correct: true });
    expect(specs[3]).to.include({ numericAnswer: 3.14, tolerance: 0.01 });
    const f = factory();
    specs.forEach((s) => f.create({ ...s, topicId: 't' }));
  });

  it('Google Forms importer maps radio/checkbox/text/ungraded items', () => {
    const form = {
      items: [
        { title: 'Section header' },
        { title: 'Capital of France?', questionItem: { question: { choiceQuestion: { type: 'RADIO', options: [{ value: 'Paris' }, { value: 'Rome' }] }, grading: { correctAnswers: { answers: [{ value: 'Paris' }] } } } } },
        { title: 'Primes?', questionItem: { question: { choiceQuestion: { type: 'CHECKBOX', options: [{ value: '2' }, { value: '3' }, { value: '4' }] }, grading: { correctAnswers: { answers: [{ value: '2' }, { value: '3' }] } } } } },
        { title: 'Sky is blue', questionItem: { question: { choiceQuestion: { type: 'RADIO', options: [{ value: 'True' }, { value: 'False' }] }, grading: { correctAnswers: { answers: [{ value: 'True' }] } } } } },
        { title: '6 x 7', questionItem: { question: { textQuestion: {}, grading: { correctAnswers: { answers: [{ value: '42' }] } } } } },
        { title: 'Lunch?', questionItem: { question: { choiceQuestion: { type: 'RADIO', options: [{ value: 'Pizza' }, { value: 'Dosa' }] } } } },
      ],
    };
    const specs = new GoogleFormsImporter().parse(JSON.stringify(form));
    expect(specs.map((s) => s.type)).to.deep.equal(['mcq', 'multi_select', 'true_false', 'numeric', 'poll']);
  });
});

describe('Export adapters', () => {
  it('CSV exporter escapes and includes every section', () => {
    const file = new CsvResultsExporter().export({
      sessionId: 's', roomCode: 'R', quizTitle: 'Quiz, "one"', scoringMode: 'speed', playerCount: 1, generatedAt: 0,
      leaderboard: [{ playerId: 'a', nickname: 'Ann', rank: 1, total: 900, streak: 1, correctCount: 1, lastPoints: 900, lastCorrect: true }],
      questions: [], groups: [], groupLevel: 'topic', struggling: [], hardestQuestions: [],
    });
    expect(file.filename).to.equal('pulse-R-results.csv');
    expect(file.body).to.contain('"Quiz, ""one"""').and.contain('1,Ann,900,1');
  });
});
