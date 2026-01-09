/**
 * Контекст данных для шаблона: ключ -> значение.
 * Значение может быть строкой, числом, boolean, массивом строк и т.п.
 */
export type TemplateData = Record<string, unknown>;

/**
 * Фильтры, работающие со строкой.
 * (Параметризованные фильтры типа join обрабатываются отдельно.)
 */
export type TemplateFilters = Record<string, (value: string) => string>;

/**
 * Форматирует дату к DD.MM.YYYY, если распознаётся ISO YYYY-MM-DD.
 * Иначе возвращает исходную строку.
 */
export const formatDateDDMMYYYY = (value: string): string => {
    const s = String(value ?? "").trim();
    if (!s) return "";
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return s;
};

/**
 * Делает первую букву заглавной (для русских/латинских строк).
 */
export const capitalizeFirst = (value: string): string => {
    const s = String(value ?? "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Нормализует пробелы и пунктуацию (минимально).
 * Важно: не ломает даты формата 23.12.2025.
 */
const normalizeText = (s: string): string => {
    return String(s ?? "")
        // 1) Даты: 23. 12. 2025 -> 23.12.2025
        .replace(/(\d)\.\s+(\d)/g, "$1.$2")

        // 2) Сжать множественные пробелы
        .replace(/\s+/g, " ")

        // 3) Убрать пробел перед знаками препинания
        .replace(/\s+([,.;:])/g, "$1")

        // 4) Добавить пробел после знаков препинания (кроме точки)
        .replace(/([,;:])([^\s])/g, "$1 $2")

        // 5) Страховка: точка в конце предложения — без лишних пробелов
        .replace(/\s+\./g, ".")

        .trim();
};

/**
 * Парсит фильтр вида:
 * - cap
 * - date
 * - join:", "
 * - join:"; "
 *
 * @remarks
 * Поддерживается синтаксис name:arg, где arg может быть в двойных кавычках.
 */
const parseFilterToken = (token: string): { name: string; arg?: string } => {
    const t = String(token ?? "").trim();
    const m = t.match(/^([a-zA-Z_][\w-]*)(?::\s*(.+))?$/);
    if (!m) return { name: t };

    const name = m[1];
    let arg = m[2]?.trim();

    // Убрать кавычки "..."
    if (arg && /^".*"$/.test(arg)) arg = arg.slice(1, -1);

    return { name, arg };
};

/**
 * Приводит значение к массиву строк.
 * - массив → массив строк
 * - строка "a, b, c" → ["a", "b", "c"]
 * - строка без запятых → ["строка"]
 * - остальное → []
 *
 * @remarks
 * Эта функция нужна, чтобы join работал универсально.
 */
const toStringArray = (v: unknown): string[] => {
    if (v == null) return [];

    if (Array.isArray(v)) {
        return v.map(String).map((x) => x.trim()).filter(Boolean);
    }

    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return [];

        // Если есть запятая — делим, иначе возвращаем единичный элемент.
        if (s.includes(",")) {
            return s
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
        }
        return [s];
    }

    return [];
};

/**
 * Рендерит шаблон с поддержкой:
 * - плейсхолдеров {{key}}
 * - фильтров {{key|cap|date}}
 * - параметризованного join: {{key|join:", "}}
 * - условных блоков {{#key}} ... {{/key}}
 *
 * @remarks
 * - Чистая функция: не зависит от Obsidian/Dataview
 * - Пустые значения -> пустая строка
 * - Условные блоки считаются truthy для непустых массивов
 * - После рендера нормализует пробелы/пунктуацию
 */
export const renderTemplateV2 = (
    template: string,
    data: TemplateData,
    extraFilters?: Partial<TemplateFilters>
): string => {
    const filters: TemplateFilters = {
        trim: (v) => String(v ?? "").trim(),
        upper: (v) => String(v ?? "").toUpperCase(),
        lower: (v) => String(v ?? "").toLowerCase(),
        cap: capitalizeFirst,
        date: formatDateDDMMYYYY,
        ...(extraFilters ?? {}),
    };

    /**
     * Возвращает "сырое" значение ключа из контекста.
     */
    const getRaw = (key: string): unknown => data[key];

    /**
     * Преобразует значение в строку (мягко).
     * Для массивов по умолчанию использует ", " как разделитель.
     */
    const toStringValue = (v: unknown): string => {
        if (v == null) return "";
        if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean).join(", ");
        return String(v).trim();
    };

    /**
     * Truthy-семантика для условных блоков.
     */
    const isTruthy = (v: unknown): boolean => {
        if (v == null) return false;
        if (typeof v === "boolean") return v;
        if (typeof v === "number") return v !== 0;
        if (typeof v === "string") return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
    };

    // 1) Условные блоки: {{#key}}...{{/key}}
    let out = String(template ?? "");
    for (let i = 0; i < 10; i++) {
        const before = out;
        out = out.replace(
            /\{\{#\s*([^\}\s]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g,
            (_m, key, body) => {
                const v = getRaw(String(key));
                return isTruthy(v) ? String(body) : "";
            }
        );
        if (out === before) break;
    }

    // 2) Плейсхолдеры + фильтры
    out = out.replace(/\{\{\s*([^\}]+?)\s*\}\}/g, (_m, expr) => {
        const parts = String(expr)
            .split("|")
            .map((x) => x.trim())
            .filter(Boolean);

        if (parts.length === 0) return "";

        const key = parts[0];
        let current: unknown = getRaw(key);

        for (const token of parts.slice(1)) {
            const { name, arg } = parseFilterToken(token);

            // Универсальный join: массив ИЛИ строка "a, b, c"
            if (name === "join") {
                const sep = arg ?? ", ";
                current = toStringArray(current).join(sep);
                continue;
            }

            // Обычные строковые фильтры
            const f = filters[name];
            if (typeof f === "function") {
                current = f(toStringValue(current));
            } else {
                // неизвестный фильтр — игнорируем
                current = toStringValue(current);
            }
        }

        return toStringValue(current);
    });

    return normalizeText(out);
};
