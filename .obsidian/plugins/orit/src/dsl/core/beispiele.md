# Примеры

## Пример 1. Разница `map` и `then` на одном поле

Сценарий: вы берете `subtype` (строка или `null`) и хотите превратить ее в фрагмент текста `", тип: ..."`.

Ключ:
- `map` используется, когда функция возвращает обычное значение (не `Result`).
- `then` используется, когда функция возвращает `Result` (может дать ошибку).

```ts
// 1) Декодируем "subtype" как строку или null.
// Пустая строка -> null. Ошибок не будет.
const subtypeR = P.text()("insult_subtype", context.bound.insult_subtype);

// 2) map: делаем из (string|null) -> string.
// Никаких ошибок мы здесь не создаем. Просто формируем текст.
const subtypeTextR = R.map(subtypeR, (subtype) => {
  // subtype: string | null
  // Если null -> возвращаем пустую строку.
  if (!subtype) return "";
  return `, тип: ${subtype}`;
});

// 3) Мягкое извлечение значения.
// Если бы subtypeR был fail (здесь не будет), мы бы получили "".
const subtypeText = R.valueOr(subtypeTextR, "");

// subtypeText — обычная строка, готовая к сборке результата.
```

Когда нужен `then` в похожем месте:

```ts
// Допустим, мы хотим сделать subtype обязательным (это уже правило).
// require возвращает Result, поэтому нам нужен then.

const subtypeRequiredR = R.then(
  P.text()("insult_subtype", context.bound.insult_subtype),
  (subtype) => {
    // subtype: string|null
    // Если subtype отсутствует, возвращаем fail.
    if (!subtype) {
      return R.fail({ path: "insult_subtype", code: "missing", message: "Subtype is required." });
    }
    return R.ok(subtype);
  }
);

// Теперь subtypeRequiredR может быть fail, поэтому дальше работаем через then/map.
```

Итого:
- `map` — "переделать значение";
- `then` — "сделать следующий шаг, который может ошибиться".

## Пример 2. Декодирование нескольких полей через `collect`

Сценарий: вы хотите сразу получить объект с типами, а не таскать `unknown`.

```ts
// Декодируем минимальный набор полей.
// Здесь нет домена: только типы и допустимые значения.

const decoded = R.collect({
  // "справа" | "слева" | null
  side: P.oneOf(["справа", "слева"])("side", context.bound.insult),

  // число или null
  hand: P.int()("hand", context.bound.hand),
  leg:  P.int()("leg",  context.bound.leg),

  // булевы флаги
  hasTube: P.flag()("hasTube", context.bound.bulbarNgz),
});

// decoded: Result<{ side: string|null, hand: number|null, leg: number|null, hasTube: boolean }>

// Политика "мягко": мы хотим продолжить, даже если есть ошибки.
const dto = decoded.ok ? decoded.value : {
  side: null,
  hand: null,
  leg: null,
  hasTube: false,
};

const issues = decoded.ok ? [] : decoded.issues;

// Теперь dto — "нормальный" объект, а не набор unknown.
// Дальше доменная часть может быть простой и без typeof/trim.
```

Плюс: если вы включили строгие режимы парсеров (например `reportUnknown` у `flag`), то `issues` поможет быстро выявить нестабильные поля.

## Пример 3. "Табличный выбор" в домене без if/else

Сценарий: вы хотите получить объект формулировок в зависимости от `side`.
Это домен, но реализуется "таблично" (данные отдельно, механизм выбора отдельно).

```ts
// side уже декодирован: "справа" | "слева" | null
const side = dto.side;

// Словарь решений — домен (в заметке). Ядро сюда не тащим.
const SIDE_TABLE: Record<string, { insult: string; parez: string }> = {
  "справа": { insult: "правой", parez: "слева" },
  "слева":  { insult: "левой",  parez: "справа" },
};

// Механизм выбора — простой: если ключа нет, берем дефолт.
// (Это можно делать через ваш будущий универсальный pick, но пока просто.)
const sideForms = side ? (SIDE_TABLE[side] ?? { insult: "", parez: "" }) : { insult: "", parez: "" };

// sideForms.insult / sideForms.parez — обычные строки.
```

Комментарий:
- таблица (ключи и значения) — домен;
- механизм выбора (взять по ключу / дефолт) — универсален.

## Пример 4. Сборка списка текстовых блоков без пустых строк

Сценарий: вы формируете массив осложнений/фрагментов, но хотите автоматически пропускать пустое.

```ts
const blocks: string[] = [];

// Допустим, у нас есть функции домена, возвращающие строку (или "").
// Здесь они примитивные, для примера:

const makeParezText = (hand: number | null, leg: number | null): string => {
  // Доменные правила вы пишете сами. Тут просто демонстрация структуры.
  if (hand === null || leg === null) return "";
  return `парез: рука=${hand}, нога=${leg}`;
};

const makeTubeText = (hasTube: boolean): string => {
  return hasTube ? "есть НГЗ" : "";
};

// U.pushIf добавит строку только если она непустая после trim.
U.pushIf(blocks, makeParezText(dto.hand, dto.leg));
U.pushIf(blocks, makeTubeText(dto.hasTube));

// На выходе blocks содержит только реальные элементы.
```

Это почти полностью заменяет вашу ручную конструкцию `pushIf` из исходного кода.

## Пример 5. Мягкий и строгий режим для `flag`

Сценарий: значение флага "плавает" и иногда приходит странным.

По умолчанию (мягко):

```ts
// Неизвестное -> false, без ошибок.
const fR = P.flag()("foley", context.bound.foley);
const f = R.valueOr(fR, false);
```

Строго (диагностика данных):

```ts
// Теперь неизвестное значение даст fail(parse/type).
const fR = P.flag({ reportUnknown: true })("foley", context.bound.foley);

if (!fR.ok) {
  // Здесь удобно залогировать или вывести issues.
  // В заметке можно показать их пользователю/себе.
  console.log("Bad flag value:", fR.issues);
}

// В строгом режиме вы можете решать политику:
const f = R.valueOr(fR, false); // все еще можно продолжить мягко, но уже видя issues
```

Комментарий: вы не обязаны выбирать "только мягко" или "только строго". Вы можете:
- в декодере быть строгим (с `issues`);
- а в рендере — мягким (`valueOr`).

## Пример 6. Безопасный рендер через `guard`

Сценарий: `tmpRender` может бросить исключение (шаблон/данные).

```ts
// data — ваш объект данных для шаблона
const data = {
  date: context.bound.oddate,
  side: sideForms.insult,
  // ...
};

// guard защищает от падения наружу.
// Любое исключение превращаем в Issue.
const renderedR = R.guard(
  () => tmpRender(tmp, data),
  (e) => ({
    path: "render",
    code: "exception",
    message: "Template render failed.",
    meta: e, // можно сохранить оригинальную ошибку для отладки
  })
);

// Политика: в случае ошибки — показываем понятный fallback.
const rendered = renderedR.ok
  ? renderedR.value
  : `⚠️ Ошибка рендера: ${renderedR.issues.map(i => i.message).join("; ")}`;

// Далее уже обычный markdown create.
return engine.markdown.create(rendered);
```

Важно: `guard` — это граница. Все "опасное" должно быть обернуто именно так, чтобы не ломать заметку.

## Пример 7. Полный мини-пайплайн "как в вашей заметке"

Это самый близкий к вашему исходному сценарию учебный пример:
"декодировали → приняли политику ошибок → собрали фрагменты → защитили рендер".

```ts
// 1) Декодируем входы (только форма данных)
const decoded = R.collect({
  side: P.oneOf(["справа", "слева"])("side", context.bound.insult),

  hand: P.int()("hand", context.bound.hand),
  leg:  P.int()("leg",  context.bound.leg),

  hasTube: P.flag()("hasTube", context.bound.bulbarNgz),

  subtype: P.text()("subtype", context.bound.insult_subtype),
});

// 2) Мягкий режим (один раз решаем, что делать с ошибками)
const dto = decoded.ok ? decoded.value : { side: null, hand: null, leg: null, hasTube: false, subtype: null };
const issues = decoded.ok ? [] : decoded.issues;

// 3) Доменная сборка (здесь — простая демонстрация)
const sideTable: Record<string, { insult: string; parez: string }> = {
  "справа": { insult: "правой", parez: "слева" },
  "слева":  { insult: "левой",  parez: "справа" },
};

const sideForms = dto.side ? (sideTable[dto.side] ?? { insult: "", parez: "" }) : { insult: "", parez: "" };

const blocks: string[] = [];

U.pushIf(blocks, dto.subtype ? `тип: ${dto.subtype}` : "");
U.pushIf(blocks, dto.hasTube ? "есть НГЗ" : "");

// Пример "парез" — просто демонстрация структуры:
U.pushIf(blocks, (dto.hand !== null && dto.leg !== null) ? `парез: рука=${dto.hand}, нога=${dto.leg}` : "");

// 4) Формируем данные для шаблона
const data = {
  side: sideForms.insult,
  blocks,
};

// 5) Безопасный рендер
const renderedR = R.guard(
  () => tmpRender(tmp, data),
  (e) => ({ path: "render", code: "exception", message: "Template render failed.", meta: e })
);

const rendered = renderedR.ok ? renderedR.value : "⚠️ Рендер не выполнен.";

// 6) (опционально) вывести issues как диагностику
// Это не обязательно, но очень полезно в начале внедрения.
const diag = issues.length
  ? "\n\n---\n\n" + issues.map(i => `- [${i.code}] ${i.path ?? ""}: ${i.message}`).join("\n")
  : "";

return engine.markdown.create(rendered + diag);
```

## Что делать дальше, чтобы "вникать" без перегруза

Если вы будете разбирать это как учебник, рекомендую такой порядок:
- пример 6 (`guard`) — самый практичный: перестанет падать;
- пример 2 (`collect`) — перестанет течь `unknown`;
- пример 4 (`pushIf`) — станет меньше шума в сборке фраз;
- пример 7 — собрать все вместе.

Примеры “самые простые” на ваших полях
Пример A. strict для обязательного поля (дата должна быть)
// "oddate" обязателен, но мы не парсим дату, просто требуем непустой текст.
const dateR = P2.text("strict")("oddate", context.bound.oddate);

// дальше можно либо строго остановиться, либо мягко продолжить:
if (!dateR.ok) {
  // например, выводим диагностический блок
  console.log(dateR.issues);
}
const dateText = R.valueOr(dateR, ""); // мягкий режим извлечения

Пример B. intOneOf для шкалы 0..3
// Значение должно быть 0..3; пусто допускаем (soft), мусор/вне набора -> ошибка.
const aphasiaScoreR = P2.intOneOf([0,1,2,3], "soft")("aphasiaScore", context.bound.aphasiaScore);

Пример C. pick по таблице “справа/слева” → объект формулировок
// Таблица — доменные данные, но механизм выбора — универсальный.
const SIDE_TABLE = {
  "справа": { insult: "правой", parez: "слева" },
  "слева":  { insult: "левой",  parez: "справа" },
};

// мягко: если side пустой/неизвестный, вернём дефолт
const sideFormsR = P2.pick(SIDE_TABLE, "soft", { insult: "", parez: "" })("side", context.bound.insult);
const sideForms = R.valueOr(sideFormsR, { insult: "", parez: "" });

Пример D. listText для DV полей “одно или массив”
const tagsR = P2.listText("soft")("tags", context.bound.tags);
// tagsR.value: string[]

Пример реализации сложной логики на уровне домена