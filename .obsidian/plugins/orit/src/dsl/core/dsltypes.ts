export type IssueCode =
    | "missing"
    | "type"
    | "invalid"
    | "range"
    | "enum"
    | "parse"
    | "conflict";

export type Issue = {
    path?: string;          // "a.b.c" — опционально, чтобы не привязываться к структуре
    code: IssueCode;
    message: string;        // человекочитаемо, но без доменной лексики
    meta?: unknown;         // опционально: детали для отладки
};

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; issues: Issue[] };
