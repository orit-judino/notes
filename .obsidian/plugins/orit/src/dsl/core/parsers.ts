/**
 * P2 — парсеры следующего уровня.
 *
 * Все функции возвращают Result и не содержат домена.
 * Они либо приводят тип, либо проверяют форму, либо выбирают значение по таблице.
 */

import { fail, ok, Result, issue, str } from "./core";

type Mode = "soft" | "strict";

const isEmpty = (v: unknown): boolean => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return str(v) === "";
    return false;
};

const missingIfStrict = (mode: Mode, path: string, message: string): Result<null> => {
    return mode === "strict"
        ? fail(issue(path, "missing", message))
        : ok(null);
};

export const P2 = {
    /**
     * text(mode?) — строка или null.
     * Это “унификация”: в строгом режиме пусто -> missing.
     *
     * В soft режиме полностью совпадает с P.text().
     */
    text:
        (mode: Mode = "soft") =>
            (path: string, v: unknown): Result<string | null> => {
                const x = str(v);
                if (!x) return mode === "strict"
                    ? fail(issue(path, "missing", "Text is required."))
                    : ok(null);
                return ok(x);
            },

    /**
     * num(mode?) — число (float) или null.
     * - пусто -> null (soft) или missing (strict)
     * - number -> ok(number) если finite
     * - строка -> Number(...) если finite
     */
    num:
        (mode: Mode = "soft") =>
            (path: string, v: unknown): Result<number | null> => {
                if (isEmpty(v)) return mode === "strict"
                    ? fail(issue(path, "missing", "Number is required."))
                    : ok(null);

                if (typeof v === "number") {
                    return Number.isFinite(v)
                        ? ok(v)
                        : fail(issue(path, "type", "Expected finite number.", { value: v }));
                }

                const x = str(v);
                if (!x) return mode === "strict"
                    ? fail(issue(path, "missing", "Number is required."))
                    : ok(null);

                const n = Number(x);
                if (!Number.isFinite(n)) return fail(issue(path, "parse", "Cannot parse number.", { value: v }));
                return ok(n);
            },

    /**
     * int(mode?) — целое число или null.
     * (то же, что P.int, но с поддержкой strict режима по пустому)
     */
    int:
        (mode: Mode = "soft") =>
            (path: string, v: unknown): Result<number | null> => {
                if (isEmpty(v)) return mode === "strict"
                    ? fail(issue(path, "missing", "Integer is required."))
                    : ok(null);

                // number
                if (typeof v === "number") {
                    if (!Number.isFinite(v)) return fail(issue(path, "type", "Expected finite number.", { value: v }));
                    if (!Number.isInteger(v)) return fail(issue(path, "type", "Expected integer.", { value: v }));
                    return ok(v);
                }

                const x = str(v);
                if (!x) return mode === "strict"
                    ? fail(issue(path, "missing", "Integer is required."))
                    : ok(null);

                const n = Number(x);
                if (!Number.isFinite(n)) return fail(issue(path, "parse", "Cannot parse number.", { value: v }));
                if (!Number.isInteger(n)) return fail(issue(path, "type", "Expected integer.", { value: v }));
                return ok(n);
            },

    /**
     * oneOf(allowed, mode?) — значение из списка или null.
     * - пусто -> null (soft) или missing (strict)
     * - не из allowed -> enum
     */
    oneOf:
        (allowed: readonly string[], mode: Mode = "soft") =>
            (path: string, v: unknown): Result<string | null> => {
                const x = str(v);
                if (!x) return mode === "strict"
                    ? fail(issue(path, "missing", "Value is required."))
                    : ok(null);

                if (allowed.includes(x)) return ok(x);
                return fail(issue(path, "enum", "Value is not in allowed set.", { value: v, allowed }));
            },

    /**
     * intOneOf(allowedNumbers, mode?) — целое из набора или null.
     */
    intOneOf:
        (allowed: readonly number[], mode: Mode = "soft") =>
            (path: string, v: unknown): Result<number | null> =>
                then(P2.int(mode)(path, v), n => {
                    if (n === null) return ok(null); // сюда попадём только в soft режиме
                    if (allowed.includes(n)) return ok(n);
                    return fail(issue(path, "range", "Integer is not in allowed set.", { value: n, allowed }));
                }),

    /**
     * flag(mode?, options?) — булево.
     * - strict: пусто -> missing
     * - soft: пусто -> false
     * - неизвестное: по reportUnknown
     */
    flag:
        (
            mode: Mode = "soft",
            opts: { reportUnknown?: boolean } = { reportUnknown: false }
        ) =>
            (path: string, v: unknown): Result<boolean> => {
                // strict: пусто -> missing
                if (isEmpty(v)) {
                    return mode === "strict"
                        ? fail(issue(path, "missing", "Flag is required."))
                        : ok(false);
                }

                // boolean
                if (v === true) return ok(true);
                if (v === false) return ok(false);

                // number
                if (typeof v === "number") {
                    if (v === 1) return ok(true);
                    if (v === 0) return ok(false);
                    return opts.reportUnknown
                        ? fail(issue(path, "type", "Expected flag as 0/1.", { value: v }))
                        : ok(false);
                }

                // string tokens
                const t = str(v).toLowerCase();
                const TRUE = new Set(["true", "1", "yes", "y", "on", "checked", "да"]);
                const FALSE = new Set(["false", "0", "no", "n", "off", "unchecked", "нет"]);
                if (TRUE.has(t)) return ok(true);
                if (FALSE.has(t)) return ok(false);

                return opts.reportUnknown
                    ? fail(issue(path, "parse", "Unrecognized flag token.", { value: v }))
                    : ok(false);
            },

    /**
     * object(mode?) — проверить, что это простой объект.
     * Иногда полезно для защиты от неожиданного массива/строки.
     */
    object:
        (mode: Mode = "soft") =>
            (path: string, v: unknown): Result<Record<string, unknown> | null> => {
                if (isEmpty(v)) return missingIfStrict(mode, path, "Object is required.") as Result<Record<string, unknown> | null>;

                if (v && typeof v === "object" && !Array.isArray(v)) {
                    return ok(v as Record<string, unknown>);
                }

                return fail(issue(path, "type", "Expected object.", { value: v }));
            },

    /**
     * listText(mode?) — привести значение к массиву строк.
     *
     * Типичный кейс Dataview: поле может быть
     * - строкой
     * - массивом строк
     * - null
     *
     * Правила:
     * - soft: пусто -> []
     * - strict: пусто -> missing
     * - если массив: нормализуем каждый элемент через str(...) и убираем пустые
     * - если скаляр: делаем [str(v)] если не пусто
     */
    listText:
        (mode: Mode = "soft") =>
            (path: string, v: unknown): Result<string[]> => {
                if (isEmpty(v)) {
                    return mode === "strict"
                        ? fail(issue(path, "missing", "List is required."))
                        : ok([]);
                }

                if (Array.isArray(v)) {
                    const out = v.map(x => str(x)).filter(x => x !== "");
                    return ok(out);
                }

                const x = str(v);
                if (!x) {
                    return mode === "strict"
                        ? fail(issue(path, "missing", "List is required."))
                        : ok([]);
                }
                return ok([x]);
            },

    /**
     * pick(table, mode?, default?)
     *
     * Универсальный "decider" по таблице.
     * table: Record<string, V>
     *
     * - key пустой:
     *   - soft: вернуть default (если задан) или null
     *   - strict: missing
     * - ключ отсутствует в table:
     *   - soft: вернуть default (если задан) или null
     *   - strict: enum (ключ не из допустимых)
     *
     * Важно: эта функция не доменная, потому что не знает, что в table.
     * Доменные только данные table (ключи и значения).
     */
    pick:
        <V>(
            table: Record<string, V>,
            mode: Mode = "soft",
            def: V | null = null
        ) =>
            (path: string, key: unknown): Result<V | null> => {
                const k = str(key);

                if (!k) {
                    return mode === "strict"
                        ? fail(issue(path, "missing", "Key is required."))
                        : ok(def);
                }

                if (Object.prototype.hasOwnProperty.call(table, k)) {
                    return ok(table[k]);
                }

                return mode === "strict"
                    ? fail(issue(path, "enum", "Key is not in table.", { value: key, allowed: Object.keys(table) }))
                    : ok(def);
            },
};
