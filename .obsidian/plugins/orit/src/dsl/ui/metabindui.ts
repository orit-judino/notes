// src/api/uiMini.ts
/* eslint-disable @typescript-eslint/no-base-to-string */

import { Core } from "../core/core"; // поправьте путь под ваш проект

/**
 * LinkLike — "утка" для ссылок Obsidian/Dataview.
 * Нам не нужен конкретный тип, достаточно нескольких типичных полей.
 */
export type LinkLike =
    | string
    | {
        display?: unknown;
        path?: unknown;
        file?: { path?: unknown } | unknown;
        [k: string]: unknown;
    };

export type TextListInput = string | LinkLike[] | null | undefined;

export type NormalizeTextListOptions = {
    splitCSV?: boolean;      // строка "a, b" -> ["a","b"]
    delimiter?: string;      // по умолчанию ","
    preferDisplay?: boolean; // для ссылок: display предпочтительнее path
    trim?: boolean;          // по умолчанию true
    dropEmpty?: boolean;     // по умолчанию true
};

const DEFAULT_NORM: Required<NormalizeTextListOptions> = {
    splitCSV: true,
    delimiter: ",",
    preferDisplay: true,
    trim: true,
    dropEmpty: true,
};

const s = (v: unknown): string => String(v ?? "").trim();

/**
 * Вытаскиваем "человеческий" текст из элемента массива.
 * Поддерживаем:
 * - string
 * - link-like objects (display/path/file.path)
 */
export const extractText = (x: unknown, opts?: NormalizeTextListOptions): string => {
    const o = { ...DEFAULT_NORM, ...(opts ?? {}) };

    if (x === null || x === undefined) return "";

    if (typeof x === "string") return o.trim ? x.trim() : x;

    if (typeof x === "object") {
        const obj = x as any;

        const display = typeof obj.display === "string" ? (o.trim ? obj.display.trim() : obj.display) : "";
        const path = typeof obj.path === "string" ? (o.trim ? obj.path.trim() : obj.path) : "";
        const filePath =
            obj.file && typeof obj.file.path === "string"
                ? (o.trim ? obj.file.path.trim() : obj.file.path)
                : "";

        // Приоритет: display -> path -> file.path (или наоборот, если preferDisplay=false)
        if (o.preferDisplay) return display || path || filePath || "";
        return path || filePath || display || "";
    }

    return o.trim ? s(x) : String(x ?? "");
};

/**
 * normalizeTextList:
 * - string: либо ["a"], либо splitCSV -> ["a","b"]
 * - array: каждый элемент -> extractText
 * - other: []
 */
export const normalizeTextList = (v: TextListInput, opts?: NormalizeTextListOptions): string[] => {
    const o = { ...DEFAULT_NORM, ...(opts ?? {}) };

    // string
    if (typeof v === "string") {
        const t = o.trim ? v.trim() : v;
        if (!t) return [];

        if (o.splitCSV && t.includes(o.delimiter)) {
            const parts = t.split(o.delimiter).map(p => (o.trim ? p.trim() : p));
            return o.dropEmpty ? parts.filter(Boolean) : parts;
        }

        return [t];
    }

    // array
    if (Array.isArray(v)) {
        const parts = v.map(x => extractText(x, o));
        return o.dropEmpty ? parts.filter(Boolean) : parts;
    }

    return [];
};

/**
 * buildInlineSelect:
 * Возвращает markdown или null, если элементов мало.
 */
export const buildInlineSelect = (spec: {
    label: string;     // заголовок, домен задаёт снаружи
    field: string;     // куда сохраняем (Meta Bind field)
    items: string[];
    minItems?: number; // default 2
}): string | null => {
    const min = spec.minItems ?? 2;
    const items = (spec.items ?? []).map(x => s(x)).filter(Boolean);

    if (items.length < min) return null;

    const options = items.map(x => `option(${x})`).join(", ");
    return `**${spec.label}**: \`INPUT[inlineSelect(${options}):${spec.field}]\``;
};

/**
 * inlineSelectFromFM:
 * - берёт link (mkb) из заметки
 * - читает по ссылке frontmatter-ключ fmKey (через функцию, которую вы передали)
 * - нормализует в список
 * - строит inlineSelect
 *
 * Возвращает markdown string или null.
 * Никаких Result наружу — это UI-helper, ему лучше быть простым.
 */
export const inlineSelectFromFM = (spec: {
    link: unknown;
    fmKey: string;
    label: string;
    saveTo: string;
    minItems?: number;
    normalize?: NormalizeTextListOptions;
    readFromFMByLink: (link: string, key: string) => unknown;
}): string | null => {
    // 1) link как текст (мягко): пусто -> null
    const linkR = Core.text("link", spec.link);
    const linkText = linkR.ok ? linkR.value : null;
    if (!linkText) return null;

    // 2) Безопасное чтение из FM
    const rawR = Core.guard(() => spec.readFromFMByLink(linkText, spec.fmKey), "readFromFMByLink");
    if (!rawR.ok) return null;

    // 3) Нормализация списка
    const items = normalizeTextList(rawR.value as any, spec.normalize);

    // 4) Построение markdown
    return buildInlineSelect({
        label: spec.label,
        field: spec.saveTo,
        items,
        minItems: spec.minItems ?? 2,
    });
};
