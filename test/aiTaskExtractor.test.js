import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTasksFromBrainDump, splitIntoChunks } from '../src/aiTaskExtractor.js';

test('splitIntoChunks keeps large input in multiple parts', () => {
  const text = `${'a'.repeat(5100)}. ${'b'.repeat(5100)}`;
  const chunks = splitIntoChunks(text, 5000);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks.join('').length > 0, true);
});

test('extractTasksFromBrainDump dedupes tasks and applies category confidence threshold', async () => {
  const fakeClient = {
    responses: {
      create: async () => ({
        output_text: JSON.stringify({
          tasks: [
            { title: 'Prepare STOEX pitch deck', category: 'Work', categoryConfidence: 0.95 },
            { title: 'Prepare STOEX pitch deck', category: 'Work', categoryConfidence: 0.95 },
            { title: 'Call Ramesh about gold pricing', category: 'Finance', categoryConfidence: 0.65 }
          ]
        })
      })
    }
  };

  const tasks = await extractTasksFromBrainDump({
    brainDumpText: 'messy dump',
    aiClient: fakeClient,
    categories: ['Work', 'Finance']
  });

  assert.deepEqual(tasks, [
    { title: 'Prepare STOEX pitch deck', category: 'Work' },
    { title: 'Call Ramesh about gold pricing', category: null }
  ]);
});
