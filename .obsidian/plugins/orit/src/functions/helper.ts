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
        if (!linkPath) return "нет link";

        const file = resolveLinkToFile(app, linkPath, originPath ?? "");
        if (!file) return "";

        const cache = app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        if (!fm) return "нет frontmatter";

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
    return {
        textFromDVFieldbyLink: readStringDvFieldByLink,
        textFromFMbyLink: readStringFMByLink
    }
};