import { ObsHelper } from '../core/types'


/**
 * Интерфейсы для типизации данных Dataview
 */

// Упрощенная структура ссылки Obsidian (Link)
interface ObsidianLink {
    path: string;
    [key: string]: any;
}

type LinkLike = string | ObsidianLink | undefined | null;

// Структура задачи в Dataview
interface DataviewTask {
    tags: string[];
    text: string;
    completed: boolean;
    [key: string]: any;
}

// Структура страницы (заметки) в Dataview
interface DataviewPage {
    file: {
        tasks: {
            values: DataviewTask[];
        };
    };
    status?: string | ObsidianLink;
    [key: string]: any;
}

export interface DVHelper {
    filterTasksByStatusAndTag: (
        pages: DataviewPage[],
        targetStatus: string,
        targetTag: string
    ) => DataviewTask[] | null
}

/**
 * Группа ЧИСТЫХ функций
 */

/**
 * Приводит значение ссылки к строке (пути).
 * Если на вход пришла строка, возвращает её же.
 */
export const normalizeStatus = (value: string | ObsidianLink | undefined): string => {
    if (!value) return "";
    if (typeof value === "object" && "path" in value) {
        return value.path;
    }
    return value as string;
};

/**
 * Проверяет, содержит ли задача конкретный тег.
 * (Чистая функция: работает только с входным массивом строк)
 */
export const hasTag = (taskTags: string[] | undefined, targetTag: string): boolean => {
    if (!taskTags) return false;
    return taskTags.includes(targetTag);
};

/**
 * ОСНОВНАЯ ЛОГИКА (Core Logic)
 * Принимает сырые данные и возвращает результат фильтрации.
 * Не зависит от внешнего окружения (API Obsidian/Dataview).
 */
export const filterTasksByStatusAndTag = (
    pages: DataviewPage[],
    targetStatus: string,
    targetTag: string
): DataviewTask[] => {
    return pages
        .filter((page) => normalizeStatus(page.status) === targetStatus)
        .flatMap((page) => page.file.tasks.values)
        .filter((task) => hasTag(task.tags, targetTag));
};

export const dvhelper: DVHelper = {
    filterTasksByStatusAndTag,
}


/**
 * Возвращает "сырой" путь (или исходную строку), если пришёл Link-объект.
 * Не пытается парсить [[...]] — только переводит link-object -> string.
 */
export const linkLikeToString = (value: LinkLike): string => {
    if (!value) return "";
    if (typeof value === "object" && "path" in value && typeof value.path === "string") {
        return value.path;
    }
    return String(value);
};

/**
 * Нормализует wikilink/строку/Link в путь без alias.
 * Примеры:
 * - '[[A/B/C.md|Title]]' -> 'A/B/C.md'
 * - 'A/B/C.md' -> 'A/B/C.md'
 * - Link{path:'A/B/C.md'} -> 'A/B/C.md'
 */
export const normalizeWikiLinkToPath = (value: LinkLike): string => {
    const s0 = linkLikeToString(value).trim();
    if (!s0) return "";

    // убрать [[ ]]
    const s1 = s0.replace(/^\[\[/, "").replace(/\]\]$/, "");

    // отсечь alias
    const s2 = s1.split("|")[0].trim();

    return s2;
};

/**
 * То же, но без расширения .md (полезно для dv.page(...) и getFirstLinkpathDest).
 */
const toPathNoMD = (value: LinkLike): string => {
    const p = normalizeWikiLinkToPath(value);
    return p.replace(/\.md$/i, "");
};

export const oh: ObsHelper = {
    toPathNoMD
}


