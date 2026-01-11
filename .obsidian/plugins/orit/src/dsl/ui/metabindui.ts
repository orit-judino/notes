// src/api/uiMini.ts
/* eslint-disable @typescript-eslint/no-base-to-string */

import { MetabindUI } from "core/types";
import { Core } from "../core/core";
import { App } from "obsidian";


const isLinkLike = (v: unknown): v is {
    display?: unknown;
    path?: unknown;
    file?: { path?: unknown };
} =>
    typeof v === "object" && v !== null;

/**
 * Привести что угодно к "человеческой" строке.
 * Пустое / непонятное -> "".
 */
const toText = (v: unknown): string => {
    if (v == null) return "";

    if (typeof v === "string") return v.trim();

    if (isLinkLike(v)) {
        if (typeof v.display === "string") return v.display.trim();
        if (typeof v.path === "string") return v.path.trim();
        if (typeof v.file?.path === "string") return v.file.path.trim();
    }

    return String(v).trim();
};


/**
 * Нормализация:
 * - string -> ["a"] или ["a","b"] (через запятую)
 * - array  -> map(toText)
 * - другое -> []
 */
const normalizeTextList = (v: unknown): string[] => {
    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return [];
        return s.includes(",")
            ? s.split(",").map(x => x.trim()).filter(Boolean)
            : [s];
    }
    if (Array.isArray(v)) {
        return v.map(toText).filter(Boolean);
    }
    return [];
};

/**
 * Строит Meta Bind inlineSelect или возвращает null.
 */
const buildInlineSelect = (
    label: string,
    field: string,
    items: string[],
    minItems = 2
): string | null => {
    if (items.length < minItems) return null;

    const options = items.map(x => `option(${x})`).join(", ");
    return `**${label}**: \`INPUT[inlineSelect(${options}):${field}]\``;
};

/**
 * Главный UI-хелпер.
 *
 * Делает всё по шагам и молча возвращает null,
 * если что-то не имеет смысла показывать.
 */
export const inlineSelectFromFM = (spec: {
    link: unknown;
    fmKey: string;
    label: string;
    saveTo: string;
    readFromFMByLink: (link: string, key: string) => unknown;
}): string | null => {
    // 1) Мягко берём ссылку как текст
    const linkR = Core.text("link", spec.link);
    const linkText = linkR.ok ? linkR.value : null;
    if (!linkText) return null;

    // 2) Безопасно читаем frontmatter
    const rawR = Core.guard(
        () => spec.readFromFMByLink(linkText, spec.fmKey),
        "readFromFMByLink"
    );
    if (!rawR.ok) return null;

    // 3) Нормализация
    const items = normalizeTextList(rawR.value);

    // 4) UI
    return buildInlineSelect(
        spec.label,
        spec.saveTo,
        items
    );
};

export const create_mbui = (_: App): MetabindUI => {
    return {
        inlineSelectFromFM
    }
}