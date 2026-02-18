const MAX_CHUNK_LENGTH = 5000;

const TASK_SCHEMA = {
  name: 'extracted_tasks',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            category: { type: ['string', 'null'] },
            categoryConfidence: { type: 'number' }
          },
          required: ['title', 'category', 'categoryConfidence']
        }
      }
    },
    required: ['tasks']
  },
  strict: true
};

export const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Errands'];

export function splitIntoChunks(text, maxLength = MAX_CHUNK_LENGTH) {
  if (!text || text.length <= maxLength) {
    return text ? [text] : [];
  }

  const chunks = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(cursor + maxLength, text.length);
    let splitPoint = end;

    if (end < text.length) {
      const window = text.slice(cursor, end);
      const sentenceBreak = Math.max(window.lastIndexOf('. '), window.lastIndexOf('\n'));
      if (sentenceBreak > maxLength * 0.5) {
        splitPoint = cursor + sentenceBreak + 1;
      }
    }

    chunks.push(text.slice(cursor, splitPoint).trim());
    cursor = splitPoint;
  }

  return chunks.filter(Boolean);
}

function normalizeTaskTitle(title) {
  return title.replace(/\s+/g, ' ').trim();
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter((task) => {
    const key = task.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function extractTasksFromBrainDump({ brainDumpText, aiClient, categories = DEFAULT_CATEGORIES }) {
  if (!brainDumpText || !brainDumpText.trim()) {
    return [];
  }

  const chunks = splitIntoChunks(brainDumpText);
  const allTasks = [];

  for (const chunk of chunks) {
    const response = await aiClient.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text:
                'You transform unstructured brain dumps into independent actionable tasks. Break compound thoughts into separate tasks, remove filler language, keep each task specific and clear, and infer categories only when confidence is high.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Predefined categories: ${categories.join(', ')}.\n\nBrain dump:\n${chunk}\n\nReturn tasks in JSON format only.`
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          ...TASK_SCHEMA
        }
      }
    });

    const payload = JSON.parse(response.output_text);
    for (const task of payload.tasks || []) {
      const title = normalizeTaskTitle(task.title || '');
      if (!title) continue;

      let category = null;
      if (
        task.category &&
        categories.includes(task.category) &&
        typeof task.categoryConfidence === 'number' &&
        task.categoryConfidence >= 0.8
      ) {
        category = task.category;
      }

      allTasks.push({ title, category });
    }
  }

  return dedupeTasks(allTasks);
}
