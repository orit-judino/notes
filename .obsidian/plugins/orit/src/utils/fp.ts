export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Result<never> => ({ ok: false, error });

// Простая проверка, чтобы VS Code понимал типы внутри if
export const isOk = <T>(res: Result<T>): res is { ok: true; value: T } => res.ok;