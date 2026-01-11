/**
 * core.ts — субъектно-независимое ядро обработки данных.
 *
 * Задача:
 * - безопасно выполнять шаги (без падений наружу),
 * - накапливать проблемы (issues),
 * - давать простые операции композиции и приведения типов.
 *
 * Ядро НЕ содержит предметной логики: никаких "диагнозов", "шкал", "правильно сказать".
 */

/* =========================
   1) Типы: Issue и Result
   ========================= */

/**
 * Код проблемы: короткая классификация без доменной лексики.
 */
export type IssueCode =
    | "missing"    // значение отсутствует (когда ожидалось)
    | "type"       // неверный тип (например, ожидали integer)
    | "enum"       // значение не входит в разрешённый список
    | "range"      // число не входит в разрешённый набор/диапазон
    | "parse"      // нельзя распознать строковое представление
    | "exception"; // поймано исключение (внешняя/опасная операция)

/**
 * Issue — структурированная проблема.
 *
 * path: путь/имя поля, где это случилось (для навигации).
 * message: короткое объяснение.
 * meta: детали для отладки (сырое значение, allowed set, и т.д.).
 */
export type Issue = {
    path?: string;
    code: IssueCode;
    message: string;
    meta?: unknown;
};

/**
 * Result<T> — единственный контейнер:
 * - ok=true: есть value: T
 * - ok=false: есть issues: Issue[]
 *
 * Ошибки всегда массивом, чтобы поддерживать накопление.
 */
export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; issues: Issue[] };

/* =========================
   2) Внутренние helpers
   ========================= */

/**
 * Нормализация в строку + trim.
 * Важно: это НЕ доменная логика, это “техническая гигиена”.
 */
// eslint-disable-next-line @typescript-eslint/no-base-to-string
const str = (v: unknown): string => String(v ?? "").trim();

/**
 * Конструктор Issue.
 * Держим внутри модуля, чтобы внешний код не плодил расхождения формата.
 */
const issue = (path: string, code: IssueCode, message: string, meta?: unknown): Issue => ({
    path,
    code,
    message,
    meta,
});

/* =========================
   3) R — операции над Result
   ========================= */

/**
 * ok(x) — успешный Result.
 */
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/**
 * fail(...) — неуспешный Result.
 * Принимает Issue или Issue[] и нормализует в массив.
 */
export const fail = (issues: Issue | Issue[]): Result<never> => ({
    ok: false,
    issues: Array.isArray(issues) ? issues : [issues],
});

/**
 * isOk/isFail — type-guards.
 * Удобны для ветвления, когда вы сознательно выбираете if/else.
 */
export const isOk = <T>(r: Result<T>): r is { ok: true; value: T } => r.ok;
export const isFail = <T>(r: Result<T>): r is { ok: false; issues: Issue[] } => !r.ok;

/**
 * map(r, f) — преобразовать значение, если r=ok.
 * Если r=fail — ошибки проходят транзитом.
 */
export const map = <T, U>(r: Result<T>, f: (v: T) => U): Result<U> =>
    r.ok ? ok(f(r.value)) : (r as unknown as Result<U>);

/**
 * then(r, f) — последовательность шагов, где f возвращает Result.
 * Это основной оператор композиции без вложенных if.
 */
export const then = <T, U>(r: Result<T>, f: (v: T) => Result<U>): Result<U> =>
    r.ok ? f(r.value) : (r as unknown as Result<U>);

/**
 * mapIssues(r, f) — трансформация issues при fail.
 * Полезно, чтобы, например, добавить префикс пути.
 */
export const mapIssues = <T>(r: Result<T>, f: (issues: Issue[]) => Issue[]): Result<T> =>
    r.ok ? r : fail(f(r.issues));

/**
 * valueOr(r, fallback) — “мягкий режим”: взять значение или запасное.
 * Важно: это точка, где вы принимаете политику игнорирования ошибок.
 */
export const valueOr = <T>(r: Result<T>, fallback: T): T => (r.ok ? r.value : fallback);

/**
 * guard(fn, toIssue) — безопасно выполнить потенциально опасную операцию.
 * Любое исключение превращаем в fail(Issue).
 */
export const guard = <T>(fn: () => T, toIssue: (e: unknown) => Issue): Result<T> => {
    try {
        return ok(fn());
    } catch (e) {
        return fail(toIssue(e));
    }
};

/**
 * collect(...) — собрать несколько Result в один Result и накопить все проблемы.
 *
 * Режимы:
 * - collect([r1, r2, ...]) -> Result<T[]>
 * - collect({a:rA, b:rB, ...}) -> Result<{a:A, b:B, ...}>
 *
 * Это ключевой “оператор декодирования”: вы собираете поля,
 * получаете либо объект значений, либо полный список проблем.
 */
type ResultValue<R> = R extends Result<infer T> ? T : never;
type Collected<TObj extends Record<string, Result<any>>> = Result<{
    [K in keyof TObj]: ResultValue<TObj[K]>;
}>;

export function collect<T>(items: Result<T>[]): Result<T[]>;
export function collect<TObj extends Record<string, Result<any>>>(obj: TObj): Collected<TObj>;
export function collect(arg: any): any {
    // 1) collect(array)
    if (Array.isArray(arg)) {
        const values: any[] = [];
        const issues: Issue[] = [];

        for (const r of arg as Result<any>[]) {
            if (r.ok) values.push(r.value);
            else issues.push(...r.issues);
        }

        return issues.length ? fail(issues) : ok(values);
    }

    // 2) collect(object)
    if (arg && typeof arg === "object") {
        const out: Record<string, any> = {};
        const issues: Issue[] = [];

        for (const [k, r] of Object.entries(arg as Record<string, Result<any>>)) {
            if (r.ok) out[k] = r.value;
            else issues.push(...r.issues);
        }

        return issues.length ? fail(issues) : ok(out);
    }

    return fail(issue("", "type", "collect expects an array or an object of Result values.", { value: arg }));
}

/**
 * require(v, path, message?) — сделать значение обязательным.
 * Если v=null/undefined -> missing.
 */
export const require = <T>(
    v: T | null | undefined,
    path: string,
    message = "Value is required."
): Result<T> => (v === null || v === undefined ? fail(issue(path, "missing", message)) : ok(v));

/**
 * ensure(r, predicate, issueFactory) — “проверка условия” на успешном значении.
 * Если условие не выполняется — fail.
 */
export const ensure = <T>(
    r: Result<T>,
    predicate: (v: T) => boolean,
    issueFactory: (v: T) => Issue
): Result<T> => then(r, v => (predicate(v) ? ok(v) : fail(issueFactory(v))));

/**
 * R — удобный экспорт “единым объектом”.
 */
export const R = {
    ok,
    fail,
    isOk,
    isFail,
    map,
    then,
    mapIssues,
    valueOr,
    guard,
    collect,
    require,
    ensure,
};

/* =========================
   4) P — простые парсеры
   ========================= */

/**
 * Парсеры — это “слой приведения”: unknown -> Result<тип | null>.
 *
 * Важно:
 * - они НЕ обязательны для использования Result.
 * - они НЕ содержат доменной логики.
 * - они должны быть маленькими и предсказуемыми.
 */
export const P = {
    /**
     * text(path, value) -> Result<string|null>
     * - пусто (после trim) -> ok(null)
     * - иначе -> ok(trimmed string)
     */
    text:
        () =>
            (path: string, v: unknown): Result<string | null> => {
                const x = str(v);
                return x ? ok(x) : ok(null);
            },

    /**
     * oneOf(allowed)(path, value) -> Result<string|null>
     * - пусто -> ok(null)
     * - если входит в allowed -> ok(value)
     * - иначе -> fail(enum)
     */
    oneOf:
        (allowed: readonly string[]) =>
            (path: string, v: unknown): Result<string | null> => {
                const x = str(v);
                if (!x) return ok(null);
                if (allowed.includes(x)) return ok(x);
                return fail(issue(path, "enum", "Value is not in allowed set.", { value: v, allowed }));
            },

    /**
     * int(path, value) -> Result<number|null>
     *
     * - null/undefined/"" -> ok(null)
     * - integer number -> ok(n)
     * - строка, парсится в integer (включая "12.0") -> ok(n)
     * - иначе -> fail(parse/type)
     *
     * Примечание: "12.0" допустимо, т.к. Number("12.0") == 12 и integer.
     */
    int:
        () =>
            (path: string, v: unknown): Result<number | null> => {
                if (v === null || v === undefined) return ok(null);

                if (typeof v === "number") {
                    if (Number.isInteger(v)) return ok(v);
                    return fail(issue(path, "type", "Expected integer number.", { value: v }));
                }

                const x = str(v);
                if (!x) return ok(null);

                const n = Number(x);
                if (!Number.isFinite(n)) return fail(issue(path, "parse", "Cannot parse number.", { value: v }));
                if (!Number.isInteger(n)) return fail(issue(path, "type", "Expected integer.", { value: v }));

                return ok(n);
            },

    /**
     * intOneOf(allowedNumbers)(path, value) -> Result<number|null>
     * int + проверка на принадлежность множеству.
     */
    intOneOf:
        (allowed: readonly number[]) =>
            (path: string, v: unknown): Result<number | null> =>
                then(P.int()(path, v), n => {
                    if (n === null) return ok(null);
                    if (allowed.includes(n)) return ok(n);
                    return fail(issue(path, "range", "Integer is not in allowed set.", { value: n, allowed }));
                }),

    /**
     * flag(options?)(path, value) -> Result<boolean>
     *
     * Мягкий булевый парсер. Политика по умолчанию:
     * - пусто/неизвестно -> false
     * - без ошибок (reportUnknown=false)
     *
     * Поддерживаемые формы:
     * - boolean
     * - 1/0 (number)
     * - строки: true/false, 1/0, yes/no, on/off, checked/unchecked, да/нет
     */
    flag:
        (
            opts: {
                nullAs?: boolean;
                reportUnknown?: boolean;
            } = { nullAs: false, reportUnknown: false }
        ) =>
            (path: string, v: unknown): Result<boolean> => {
                if (v === true) return ok(true);
                if (v === false) return ok(false);

                if (v === null || v === undefined) return ok(!!opts.nullAs);

                if (typeof v === "number") {
                    if (v === 1) return ok(true);
                    if (v === 0) return ok(false);
                    return opts.reportUnknown
                        ? fail(issue(path, "type", "Expected flag as 0/1.", { value: v }))
                        : ok(false);
                }

                const x = str(v);
                if (!x) return ok(!!opts.nullAs);

                const t = x.toLowerCase();
                const TRUE = new Set(["true", "1", "yes", "y", "on", "checked", "да"]);
                const FALSE = new Set(["false", "0", "no", "n", "off", "unchecked", "нет"]);

                if (TRUE.has(t)) return ok(true);
                if (FALSE.has(t)) return ok(false);

                return opts.reportUnknown
                    ? fail(issue(path, "parse", "Unrecognized flag token.", { value: v }))
                    : ok(false);
            },
    // ===== Strict (required) variants =====

    /**
     * textReq()
     *
     * В отличие от text():
     * - text()   : пусто -> ok(null)
     * - textReq(): пусто -> fail(missing)
     *
     * Это удобно, когда поле обязательно, но вы хотите сохранить общую архитектуру Result.
     */
    textReq:
        () =>
            (path: string, v: unknown): Result<string> => {
                const x = str(v);
                return x
                    ? ok(x)
                    : fail(issue(path, "missing", "Text is required.", { value: v }));
            },

    /**
     * intReq()
     *
     * В отличие от int():
     * - int()    : пусто -> ok(null)
     * - intReq() : пусто -> fail(missing)
     *
     * Остальные ошибки (parse/type) остаются теми же, что и у int().
     */
    intReq:
        () =>
            (path: string, v: unknown): Result<number> =>
                then(P.int()(path, v), (n) => {
                    if (n === null) return fail(issue(path, "missing", "Integer is required.", { value: v }));
                    return ok(n);
                }),

    /**
     * oneOfReq(allowed)
     *
     * В отличие от oneOf():
     * - oneOf()    : пусто -> ok(null)
     * - oneOfReq() : пусто -> fail(missing)
     *
     * Если значение не входит в allowed — fail(enum), как и в oneOf().
     */
    oneOfReq:
        (allowed: readonly string[]) =>
            (path: string, v: unknown): Result<string> =>
                then(P.oneOf(allowed)(path, v), (s) => {
                    if (s === null) return fail(issue(path, "missing", "Value is required.", { value: v, allowed }));
                    return ok(s);
                }),

    /**
     * intOneOfReq(allowedNumbers)
     *
     * В отличие от intOneOf():
     * - intOneOf()    : пусто -> ok(null)
     * - intOneOfReq() : пусто -> fail(missing)
     *
     * Если число вне allowed — fail(range), как и в intOneOf().
     */
    intOneOfReq:
        (allowed: readonly number[]) =>
            (path: string, v: unknown): Result<number> =>
                then(P.intOneOf(allowed)(path, v), (n) => {
                    if (n === null) return fail(issue(path, "missing", "Value is required.", { value: v, allowed }));
                    return ok(n);
                }),

    /**
     * flagReq(options?)
     *
     * В отличие от flag():
     * - flag()    : пусто -> ok(false) (мягкий режим)
     * - flagReq() : пусто -> fail(missing)
     *
     * Остальные токены парсятся как у flag().
     */
    flagReq:
        (opts: { reportUnknown?: boolean } = { reportUnknown: false }) =>
            (path: string, v: unknown): Result<boolean> => {
                // “пусто” для flag — это null/undefined/пустая строка
                const empty = v === null || v === undefined || (typeof v === "string" && str(v) === "");
                if (empty) return fail(issue(path, "missing", "Flag is required.", { value: v }));

                return P.flag({ reportUnknown: !!opts.reportUnknown })(path, v);
            },


};

/* =========================
   5) U — утилиты
   ========================= */

export const U = {
    /**
     * pushIf(list, text) — добавить непустую строку в массив.
     */
    pushIf: (arr: string[], text: unknown) => {
        const x = str(text);
        if (x) arr.push(x);
    },

    /**
     * compact — удалить null/undefined/"" из массива.
     */
    compact: <T>(arr: Array<T | null | undefined | "">): T[] =>
        arr.filter(x => x !== null && x !== undefined && x !== "") as T[],

    /**
     * join — compact + join.
     */
    join: (arr: Array<string | null | undefined>, sep = ", "): string =>
        U.compact(arr).join(sep),

    /**
     * wrap — если строка непустая, обернуть prefix/suffix, иначе "".
     */
    wrap: (text: unknown, prefix: string, suffix: string): string => {
        const x = str(text);
        return x ? `${prefix}${x}${suffix}` : "";
    },
};
