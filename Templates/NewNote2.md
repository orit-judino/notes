


```dataviewjs
const getTasksByFileStatus = (folder, fileStatus) => {
  const norm = (x) => String(x ?? "").trim();
  const tasks = dv.pages(`"${folder}"`)
    .where(p => norm(p.status) !== norm('statusA'))
    .file.tasks;
  return tasks.map(t=>t.text)
};

let output = [];

const results1 = getTasksByFileStatus("folder", "statusA");
console.log("result1", results1)
if (results1.length > 0) {
    output.push("**Результат:**");
    output.push(...results1.map(t => "- " + t));
}

dv.paragraph(output.join("\n") || "Задач не найдено");
```

```dataviewjs
const FOLDER = "folder"
const TARGET_STATUS = "StatusA"

const norm = x => String(x ?? "").trim().toLowerCase()

const pages = (FOLDER && FOLDER.length)
  ? dv.pages(`"${FOLDER}"`)
  : dv.pages()

dv.header(3, "Диагностика")
dv.table(
  ["file", "status(raw)", "status(norm)", "match"],
  pages.map(p => [
    p.file.link,
    p.status,
    norm(p.status),
    norm(p.status) === norm(TARGET_STATUS)
  ])
)

const filteredPages = pages.where(p => norm(p.status) === norm(TARGET_STATUS))
const tasks = filteredPages.file.tasks

dv.header(3, "Результат")
tasks.length
  ? dv.taskList(tasks, false)
  : dv.paragraph("Задач не найдено")


```


```dataviewjs
const FOLDER = "folder"
const STATUS = "StatusA"

const norm = x => String(x ?? "").trim().toLowerCase()

const pages = (FOLDER && FOLDER.length)
  ? dv.pages(`"${FOLDER}"`)
  : dv.pages()

const tasks = pages
  .where(p => norm(p.status) === norm(STATUS))
  .file.tasks

dv.taskList(tasks, false)

```
```dataviewjs
const getTasksByFolderStatusHeader = (folder, status, header) => {
  const norm = x => String(x ?? "").trim().toLowerCase()

  const pages = (folder && folder.length)
    ? dv.pages(`"${folder}"`)
    : dv.pages()

  return pages
    .where(p => norm(p.status) === norm(status))
    .file.tasks
    .where(t => norm(t.header?.subpath) === norm(header))
}

const tasks = getTasksByFolderStatusHeader("folder", "StatusB", "Header3")
dv.taskList(tasks, false)

```

