import { Issue, Result } from "./dsltypes";

// Категория A. Конструкторы и предикаты (обязательные)
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const err = (issues: Issue | Issue[]): Result<never> => ({
    ok: false,
    issues: Array.isArray(issues) ? issues : [issues],
});

export const isOk = <T>(r: Result<T>): r is { ok: true; value: T } => r.ok;
export const isErr = <T>(r: Result<T>): r is { ok: false; issues: Issue[] } => !r.ok;

//Категория B. Композиция (обязательные)
export const map = <T, U>(r: Result<T>, f: (v: T) => U): Result<U> =>
    r.ok ? ok(f(r.value)) : r;

export const mapErr = <T>(r: Result<T>, f: (issues: Issue[]) => Issue[]): Result<T> =>
    r.ok ? r : err(f(r.issues));

export const chain = <T, U>(r: Result<T>, f: (v: T) => Result<U>): Result<U> =>
    r.ok ? f(r.value) : r;

export const tap = <T>(r: Result<T>, f: (v: T) => void): Result<T> => {
    if (r.ok) f(r.value);
    return r;
};

export const tapErr = <T>(r: Result<T>, f: (issues: Issue[]) => void): Result<T> => {
    if (!r.ok) f(r.issues);
    return r;
};

export const unwrapOr = <T>(r: Result<T>, fallback: T): T =>
    r.ok ? r.value : fallback;

export const unwrapOrElse = <T>(r: Result<T>, f: (issues: Issue[]) => T): T =>
    r.ok ? r.value : f(r.issues);


// Категория C. Комбинирование с накоплением ошибок (обязательные)
export const zip = <A, B>(ra: Result<A>, rb: Result<B>): Result<[A, B]> => {
    if (ra.ok && rb.ok) return ok([ra.value, rb.value]);
    const issues: Issue[] = [];
    if (!ra.ok) issues.push(...ra.issues);
    if (!rb.ok) issues.push(...rb.issues);
    return err(issues);
};

export const all = <T>(results: Result<T>[]): Result<T[]> => {
    const values: T[] = [];
    const issues: Issue[] = [];
    for (const r of results) {
        if (r.ok) values.push(r.value);
        else issues.push(...r.issues);
    }
    return issues.length ? err(issues) : ok(values);
};

// collectOk: “мягкий” режим — игнорировать ошибки, но вернуть их отдельно.
export const collectOk = <T>(results: Result<T>[]): { values: T[]; issues: Issue[] } => {
    const values: T[] = [];
    const issues: Issue[] = [];
    for (const r of results) {
        if (r.ok) values.push(r.value);
        else issues.push(...r.issues);
    }
    return { values, issues };
};

//Категория D. “Безопасное выполнение” (обязательные)
export const tryCatch = <T>(f: () => T, issue: (e: unknown) => Issue): Result<T> => {
    try {
        return ok(f());
    } catch (e) {
        return err(issue(e));
    }
};

// Категория E. Валидации и парсеры как Result-операторы (добавляются сразу, но в минимуме)
export const requireValue = <T>(v: T | null | undefined, issue: Issue): Result<T> =>
    v === null || v === undefined ? err(issue) : ok(v);

export const refine = <T>(r: Result<T>, pred: (v: T) => boolean, issue: (v: T) => Issue): Result<T> =>
    chain(r, v => (pred(v) ? ok(v) : err(issue(v))));
