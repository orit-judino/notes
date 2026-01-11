// src/api/uiMini.ts
/* eslint-disable @typescript-eslint/no-base-to-string */

import type { App } from "obsidian";
import type { MetabindUI } from "core/types";
import { Core } from "../core/core";

/**
 * Link-like объект (Obsidian/Dataview часто возвращают такие структуры).
 * Нам нужно только: display / path / file.path.
 */
type LinkLike = {
    display?: unknown;
    path?: unknown;
    file?: { path?: unknown } | unknown;
};

const isLinkLike = (v: unknown): v is LinkLike =>
    typeof v === "object" && v !== null;

/**
 * Привести что угодно к "человеческой" строке.
 * Пустое/непонятное -> "".
 */
const toText = (v: unknown): string => {
    if (v == null) return "";

    if (typeof v === "string") return v.trim();

    if (isLinkLike(v)) {
        if (typeof v.display === "string") return v.display.trim();
        if (typeof v.path === "string") return v.path.trim();

        // file может быть unknown — проверяем мягко
        const file = v.file;
        if (typeof file === "object" && file !== null) {
            const p = (file as { path?: unknown }).path;
            if (typeof p === "string") return p.trim();
        }
    }

    return String(v).trim();
};

/**
 * Нормализация списка:
 * - string -> ["a"] или ["a","b"] (через запятую)
 * - array  -> map(toText)
 * - другое -> []
 */
const normalizeTextList = (raw: unknown): string[] => {
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return [];
        return s.includes(",")
            ? s.split(",").map(x => x.trim()).filter(Boolean)
            : [s];
    }

    if (Array.isArray(raw)) {
        return raw.map(toText).filter(Boolean);
    }

    return [];
};

/**
 * Строит Meta Bind inlineSelect или возвращает null.
 * Правило: показываем только если есть выбор (>= 2 пункта).
 */
const buildInlineSelect = (label: string, saveTo: string, items: string[]): string | null => {
    const clean = items.map(x => String(x ?? "").trim()).filter(Boolean);
    if (clean.length < 2) return null;

    const options = clean.map(x => `option(${x})`).join(", ");
    return `**${label}**: \`INPUT[inlineSelect(${options}):${saveTo}]\``;
};

/**
 * Единый интерфейс: источник строк не важен.
 * getItems возвращает "сырое" значение (строка/массив строк/массив ссылок),
 * а uiMini приводит его к string[] и строит inlineSelect.
 */
export type InlineSelectSpec = {
    label: string;
    saveTo: string;
    getItems: () => unknown;
};

export const inlineSelect = (spec: InlineSelectSpec): string | null => {
    const rawR = Core.guard(() => spec.getItems(), "getItems");
    if (!rawR.ok) return null;

    const items = normalizeTextList(rawR.value);
    return buildInlineSelect(spec.label, spec.saveTo, items);
};

/* =========================
   Обёртки-адаптеры (но всё ещё UI)
   ========================= */

export type InlineSelectFromFMSpec = {
    link: unknown; // string или link-like
    fmKey: string;
    label: string;
    saveTo: string;
    readFromFMByLink: (link: string, key: string) => unknown;
};

export const inlineSelectFromFM = (spec: InlineSelectFromFMSpec): string | null => {
    const linkR = Core.text("link", spec.link);
    const linkText = linkR.ok ? linkR.value : null;
    if (!linkText) return null;

    return inlineSelect({
        label: spec.label,
        saveTo: spec.saveTo,
        getItems: () => spec.readFromFMByLink(linkText, spec.fmKey),
    });
};

/**
 * Заголовок (heading) — источник items внедряем снаружи.
 * uiMini НЕ знает, как именно вы получаете список под заголовком.
 */
export type InlineSelectFromHeadingSpec = {
    link: unknown; // ссылка/путь на заметку-источник
    heading: string;
    label: string;
    saveTo: string;

    // у вас уже реализовано в oh: listUnderHeadingByLink(link, heading, originPath?) -> unknown
    readListUnderHeadingByLink: (link: string, heading: string, originPath?: string) => unknown;

    // чтобы резолв ссылок был корректным (как у вас в oh)
    originPath?: string;
};

export const inlineSelectFromHeading = (spec: InlineSelectFromHeadingSpec): string | null => {
    const linkR = Core.text("link", spec.link);
    const linkText = linkR.ok ? linkR.value : null;
    if (!linkText) return null;

    return inlineSelect({
        label: spec.label,
        saveTo: spec.saveTo,
        getItems: () => spec.readListUnderHeadingByLink(linkText, spec.heading, spec.originPath),
    });
};

export const create_mbui = (_app: App): MetabindUI => {
    return {
        inlineSelect,
        inlineSelectFromFM,
        inlineSelectFromHeading,
    } as unknown as MetabindUI;
};
