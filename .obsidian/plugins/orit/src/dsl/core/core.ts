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
    path?: string;
    message: string;
    meta?: unknown;
};

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; issues: Issue[] };

const issue = (path: string, message: string, meta?: unknown): Issue => ({ path, message, meta });

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
export const guard = <T>(fn: () => T, path = "guard"): Result<T> => {
    try {
        return ok(fn());
    } catch (e) {
        return fail(issue(path, "Exception caught.", e));
    }
};

/**
 * collect: собрать массив или объект Result, накопив все issues.
 */
type ResultValue<R> = R extends Result<infer T> ? T : never;
type Collected<TObj extends Record<string, Result<any>>> = Result<{
    [K in keyof TObj]: ResultValue<TObj[K]>;
}>;

export function collect<T>(items: Result<T>[]): Result<T[]>;
export function collect<TObj extends Record<string, Result<any>>>(obj: TObj): Collected<TObj>;
export function collect(arg: any): any {
    if (Array.isArray(arg)) {
        const values: any[] = [];
        const issues: Issue[] = [];
        for (const r of arg as Result<any>[]) {
            if (r.ok) values.push(r.value);
            else issues.push(...r.issues);
        }
        return issues.length ? fail(issues) : ok(values);
    }

    if (arg && typeof arg === "object") {
        const out: Record<string, any> = {};
        const issues: Issue[] = [];
        for (const [k, r] of Object.entries(arg as Record<string, Result<any>>)) {
            if (r.ok) out[k] = r.value;
            else issues.push(...r.issues);
        }
        return issues.length ? fail(issues) : ok(out);
    }

    return fail(issue("collect", "collect expects an array or an object of Result values.", { value: arg }));
}

/* =========================
   Tiny parsers
   ========================= */

const s = (v: unknown): string => String(v ?? "").trim();

/**
 * text: unknown -> Result<string|null>
 * пусто -> null
 */
export const text = (path: string, v: unknown): Result<string | null> => {
    const x = s(v);
    return ok(x ? x : null);
};

/**
 * int: unknown -> Result<number|null>
 * пусто -> null
 * мусор -> fail
 */
export const int = (path: string, v: unknown): Result<number | null> => {
    if (v === null || v === undefined) return ok(null);

    if (typeof v === "number") {
        if (Number.isInteger(v)) return ok(v);
        return fail(issue(path, "Expected integer number.", { value: v }));
    }

    const x = s(v);
    if (!x) return ok(null);

    const n = Number(x);
    if (!Number.isFinite(n)) return fail(issue(path, "Cannot parse number.", { value: v }));
    if (!Number.isInteger(n)) return fail(issue(path, "Expected integer.", { value: v }));
    return ok(n);
};

/**
 * oneOf: unknown -> Result<string|null>
 * пусто -> null
 * не из списка -> fail
 */
export const oneOf = (path: string, v: unknown, allowed: readonly string[]): Result<string | null> => {
    const x = s(v);
    if (!x) return ok(null);
    if (allowed.includes(x)) return ok(x);
    return fail(issue(path, "Value is not in allowed set.", { value: v, allowed }));
};

/* =========================
   Tiny util
   ========================= */

/**
 * pushIf: добавить строку в массив, если она не пустая.
 */
export const pushIf = (arr: string[], value: unknown) => {
    const x = s(value);
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
    collect,
    text,
    int,
    oneOf,
    pushIf,
};
