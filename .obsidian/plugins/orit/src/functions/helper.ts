import type { App, TFile } from "obsidian";
import { getAPI } from "obsidian-dataview";
import type { ObsHelper } from "core/types";


/**
 * Локальная абстракция "Dataview page":
 * Dataview возвращает объект-страницу, где поля — произвольные ключи.
 */
type DvPage = Record<string, unknown>;
/**
 * Локальная абстракция минимального Dataview API, который нам нужен.
 * Мы используем только dv.page(...).
 */
interface DvApiLike {
    /**
     * Возвращает страницу Dataview по пути заметки.
     *
     * @remarks
     * Dataview обычно принимает путь БЕЗ расширения .md.
     */
    page: (path: string) => DvPage | undefined;
}
type DvListItem = {
    text?: unknown;
    section?: { subpath?: unknown } | unknown;
};

type DvFile = {
    lists?: unknown;
};

type DvPageLike = {
    file?: unknown;
};
/**
 * Проверка, что неизвестный объект похож на Dataview API
 * (имеет метод page).
 */
const isDvApiLike = (api: unknown): api is DvApiLike => {
    return !!api && typeof (api as { page?: unknown }).page === "function";
};

/**
 * Извлекает Dataview API из Obsidian App.
 *
 * @returns DvApiLike или undefined, если Dataview не установлен/не готов.
 */
const getDvApi = (app: App): DvApiLike | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const api = getAPI(app);
    return isDvApiLike(api) ? api : undefined;
};

/**
 * Парсит wikilink/строку и возвращает "целевой путь" без alias.
 *
 * @example
 * - '[[A/B/C.md|Title]]' -> 'A/B/C.md'
 * - 'A/B/C.md' -> 'A/B/C.md'
 */
const parseWikiLink = (link: string): string => {
    const s = String(link ?? "").trim();
    if (!s) return "";

    const unwrapped = s.replace(/^\[\[/, "").replace(/\]\]$/, "");
    return (unwrapped.split("|")[0] ?? "").trim();
};

/**
 * Убирает расширение ".md" (если присутствует).
 *
 * @remarks
 * Dataview dv.page(...) обычно ожидает путь без ".md".
 */
const stripMdExtension = (path: string): string => {
    return String(path ?? "").replace(/\.md$/i, "");
};

/**
 * Резолвит linkPath (путь или имя) в TFile относительно originPath.
 *
 * @param app - Obsidian App
 * @param linkPath - путь/имя без alias (уже после parseWikiLink)
 * @param originPath - путь текущего файла (для корректного разрешения ссылок)
 */
const resolveLinkToFile = (
    app: App,
    linkPath: string,
    originPath = ""
): TFile | null => {
    if (!linkPath) return null;
    return app.metadataCache.getFirstLinkpathDest(linkPath, originPath) ?? null;
};

/**
 * Получает Dataview-страницу по файлу.
 *
 * @remarks
 * Для dv.page используем путь без ".md".
 */
const getDvPageByFile = (dv: DvApiLike, file: TFile): DvPage | undefined => {
    const dvPath = stripMdExtension(file.path);
    return dv.page(dvPath);
};

/**
 * Читает строковое поле из Dataview-страницы.
 *
 * @remarks
 * Возвращает пустую строку, если поле отсутствует или не string.
 * Это сознательный дизайн "мягкого" чтения для UI.
 */
const getStringFieldFromDvPage = (page: DvPage, field: string): string => {
    const value = page[field];
    return typeof value === "string" ? value : "";
};

/** Мягко вытащить file.lists из dv.page(...) */
const getListsFromDvPage = (page: DvPage): DvListItem[] => {
    const p = page as DvPageLike;
    const file = p.file as DvFile | undefined;

    // file.lists может быть DataArrayImpl (Proxy) => берём .values
    return unwrapDvArray(file?.lists) as DvListItem[];
};

/** Нормализуем текст пункта списка: убираем чекбокс и тримим */
const normalizeListItemText = (raw: unknown): string => {
    if (typeof raw !== "string") return "";
    const s = raw.trim();
    if (!s) return "";
    return s.replace(/^\[( |x|X)\]\s+/, "").trim();
};

/** Проверка: пункт относится к нужному заголовку */
const isUnderHeading = (li: DvListItem, heading: string): boolean => {
    const sec = li.section as { path?: unknown } | undefined;
    const path = String(sec?.path ?? "");

    if (!path) return false;

    // Берём всё после #
    const hashIndex = path.indexOf("#");
    if (hashIndex < 0) return false;

    const h = path.slice(hashIndex + 1).trim();

    return h === heading;
};
const unwrapDvArray = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
        const values = (v as { values?: unknown }).values;
        if (Array.isArray(values)) return values;
    }
    return [];
};

/**
 * Экспортируем  helper API.
 *
 */
export const create_oh = (app: App) => {
    // хелпер для извлчения данных из полей dvField
    const readStringDvFieldByLink = (
        link: string,
        dvField: string,
        originPath?: string
    ): string => {
        const dv = getDvApi(app);
        if (!dv) return "нет api";

        const linkPath = parseWikiLink(link);
        if (!linkPath) return "нет link";
        console.warn(`link ${linkPath}`)

        const file = resolveLinkToFile(app, linkPath, originPath ?? "");
        if (!file) return "";

        const page = getDvPageByFile(dv, file);
        if (!page) return "нет page";

        const data = getStringFieldFromDvPage(page, dvField);
        console.warn(`data ${data}`)
        return data
    };
    const readStringFMByLink = (
        link: string,
        fmField: string,
        originPath?: string
    ): string => {
        const linkPath = parseWikiLink(link);
        if (!linkPath) return "";

        const file = resolveLinkToFile(app, linkPath, originPath ?? "");
        if (!file) return "";

        const cache = app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        if (!fm) return "";

        const raw = (fm as Record<string, unknown>)[fmField];

        const data =
            typeof raw === "string"
                ? raw
                : Array.isArray(raw)
                    ? raw.map(String).map((x) => x.trim()).filter(Boolean).join(", ")
                    : "";

        console.warn(`dataFM ${data}`);
        return data;
    };
    const listUnderHeadingByLink = (
        link: string,
        heading: string,
        originPath?: string
    ): string[] => {
        const dv = getDvApi(app);
        if (!dv) return [];

        const linkPath = parseWikiLink(link);
        if (!linkPath) return [];

        const file = resolveLinkToFile(app, linkPath, originPath ?? "");
        if (!file) return [];

        const page = getDvPageByFile(dv, file);
        if (!page) return [];

        const lists = getListsFromDvPage(page);
        // TODO
        console.warn("lists count", lists.length);

        if (lists.length) {
            console.warn("sample section.subpath", (lists[0].section as any)?.subpath);
            console.warn("all subpaths", lists.map(x => String((x.section as any)?.subpath ?? "")));
        }
        const items = lists
            .filter(li => isUnderHeading(li, heading))
            .map(li => normalizeListItemText(li.text))
            .filter(Boolean);
        console.warn("heading =", heading);
        console.warn("matched items =", items, "len =", items.length);
        return items;
    };

    return {
        textFromDVFieldbyLink: readStringDvFieldByLink,
        textFromFMbyLink: readStringFMByLink,
        listUnderHeadingByLink
    }

};