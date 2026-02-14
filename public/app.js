const categorySelect = document.getElementById('manual-task-category');
const manualTaskForm = document.getElementById('manual-task-form');
const manualTaskTitle = document.getElementById('manual-task-title');
const convertButton = document.getElementById('convert-brain-dump');
const brainDumpInput = document.getElementById('brain-dump-input');
const taskList = document.getElementById('task-list');
const convertStatus = document.getElementById('convert-status');

const tasks = [];

function renderTasks() {
  taskList.innerHTML = '';
  for (const task of tasks) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${task.title}</strong> <span class="task-meta">${task.category ? `(${task.category})` : '(Uncategorized)'}</span>`;
    taskList.appendChild(li);
  }
}

function addTask(task) {
  tasks.push(task);
  renderTasks();
}

async function loadCategories() {
  const response = await fetch('/api/categories');
  const { categories } = await response.json();
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }
}

manualTaskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = manualTaskTitle.value.trim();
  if (!title) return;

  addTask({
    title,
    category: categorySelect.value || null
  });

  manualTaskTitle.value = '';
  categorySelect.value = '';
});

convertButton.addEventListener('click', async () => {
  const brainDumpText = brainDumpInput.value.trim();
  if (!brainDumpText) {
    convertStatus.textContent = 'Enter a brain dump before converting.';
    return;
  }

  convertStatus.textContent = 'Converting...';
  convertButton.disabled = true;

  try {
    const response = await fetch('/api/ai/extract-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brainDumpText })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Conversion failed');
    }

    if (!payload.tasks.length) {
      convertStatus.textContent = 'No actionable tasks found.';
      return;
    }

    for (const task of payload.tasks) {
      addTask(task);
    }

    convertStatus.textContent = `Added ${payload.tasks.length} task(s).`;
  } catch (error) {
    convertStatus.textContent = error.message;
  } finally {
    convertButton.disabled = false;
  }
});

await loadCategories();
renderTasks();
