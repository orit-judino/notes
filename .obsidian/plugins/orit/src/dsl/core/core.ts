/**
 * core-mini.ts — минимальное ядро.
 *
 * Цель: безопасная композиция и простое декодирование данных.
 * Никакого домена. Никаких "удобств", которые увеличивают объём.
 */

/* =========================
   Types: Issue / Result
   ========================= */

export type Issue = {
    comment?: string;
    message: string;
    meta?: unknown;
};

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; issues: Issue[] };

const issue = (comment: string, message: string, meta?: unknown): Issue => ({ comment, message, meta });

/* =========================
   Result ops
   ========================= */

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = (issues: Issue | Issue[]): Result<never> => ({
    ok: false,
    issues: Array.isArray(issues) ? issues : [issues],
});

/**
 * map: Result<T> -> Result<U> (если ok).
 */
export const map = <T, U>(r: Result<T>, f: (v: T) => U): Result<U> =>
    r.ok ? ok(f(r.value)) : (r as unknown as Result<U>);

/**
 * then: цепочка, где следующий шаг тоже Result.
 */
export const then = <T, U>(r: Result<T>, f: (v: T) => Result<U>): Result<U> =>
    r.ok ? f(r.value) : (r as unknown as Result<U>);

/**
 * guard: try/catch -> Result
 */
export const guard = <T>(fn: () => T, comment = "guard"): Result<T> => {
    try {
        return ok(fn());
    } catch (e) {
        return fail(issue(comment, "Exception caught.", e));
    }
};


/**
 * collectArr: Result<T>[] -> Result<T[]>
 * Собирает значения или накапливает все issues.
 */
export const collectArr = <T>(items: ReadonlyArray<Result<T>>): Result<T[]> => {
    const values: T[] = [];
    const issues: Issue[] = [];

    for (const r of items) {
        if (r.ok) values.push(r.value);
        else issues.push(...r.issues);
    }

    return issues.length ? fail(issues) : ok(values);
};


/**
 * collectObj: {k: Result<...>} -> Result<{k: ...}>
 *
 * TypeScript корректно выводит тип результата:
 *   collectObj({ a: ok(1), b: ok("x") })
 * -> Result<{ a: number; b: string }>
 */
type ResultValue<R> = R extends Result<infer T> ? T : never;

export const collectObj = <TObj extends Record<string, Result<unknown>>>
    (
        obj: TObj
    ): Result<{ [K in keyof TObj]: ResultValue<TObj[K]> }> => {
    const out = {} as { [K in keyof TObj]: ResultValue<TObj[K]> };
    const issues: Issue[] = [];

    // Object.keys даёт string[], приводим к keyof TObj один раз
    for (const k of Object.keys(obj) as Array<keyof TObj>) {
        const r = obj[k]!; // <- говорим TS: "здесь точно есть значение"
        if (r.ok) out[k] = r.value as ResultValue<TObj[typeof k]>;
        else issues.push(...r.issues);
    }


    return issues.length ? fail(issues) : ok(out);
};
/* =========================
   Tiny parsers
   ========================= */

// eslint-disable-next-line @typescript-eslint/no-base-to-string
export const str = (v: unknown): string => String(v ?? "").trim();

/**
 * text: unknown -> Result<string|null>
 * пусто -> null
 */
export const text = (comment: string, v: unknown): Result<string | null> => {
    const x = str(v);
    return ok(x ? x : null);
};

/**
 * int: unknown -> Result<number|null>
 * пусто -> null
 * мусор -> fail
 */
export const int = (comment: string, v: unknown): Result<number | null> => {
    if (v === null || v === undefined) return ok(null);

    if (typeof v === "number") {
        if (Number.isInteger(v)) return ok(v);
        return fail(issue(comment, "Expected integer number.", { value: v }));
    }

    const x = str(v);
    if (!x) return ok(null);

    const n = Number(x);
    if (!Number.isFinite(n)) return fail(issue(comment, "Cannot parse number.", { value: v }));
    if (!Number.isInteger(n)) return fail(issue(comment, "Expected integer.", { value: v }));
    return ok(n);
};

/**
 * oneOf: unknown -> Result<string|null>
 * пусто -> null
 * не из списка -> fail
 */
export const oneOf = (comment: string, v: unknown, allowed: readonly string[]): Result<string | null> => {
    const x = str(v);
    if (!x) return ok(null);
    if (allowed.includes(x)) return ok(x);
    return fail(issue(comment, "Value is not in allowed set.", { value: v, allowed }));
};

/* =========================
   Tiny util
   ========================= */

/**
 * pushIf: добавить строку в массив, если она не пустая.
 */
export const pushIf = (arr: string[], value: unknown) => {
    const x = str(value);
    if (x) arr.push(x);
};

/**
 * Экспорт "одним объектом" (опционально).
 */
export const Core = {
    ok,
    fail,
    map,
    then,
    guard,
    collectArr,
    collectObj,
    text,
    int,
    oneOf,
    pushIf,
};
