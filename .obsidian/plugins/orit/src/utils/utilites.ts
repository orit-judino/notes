import { App, moment } from "obsidian";
import { ok, err, Result, ResultAsync, okAsync, errAsync } from 'neverthrow'
import { Utils } from "core/types";
import { renderTemplateV2 } from "./templater";


/**
 * Парсит дату и возвращает её в строгом формате DD.MM.YYYY
 */
export const normalizeDate = (input: string): Result<string, string> => {
    // moment() сам разберется с большинством форматов
    const date = moment(input, ["YYYY-MM-DD", "DD.MM.YYYY", "DD-MM-YYYY"], true);

    if (!date.isValid()) {
        return err(`Неверный формат даты: ${input}`);
    }

    // Возвращаем именно то, что нам нужно для интерфейса
    return ok(date.format("DD.MM.YYYY"));
};

/** Универсальный лифт: Result<T,E> → ResultAsync<T,E> */
export const liftResult = <T, E>(r: Result<T, E>): ResultAsync<T, E> =>
    r.match(
        (value: T) => okAsync<T, E>(value),
        (error: E) => errAsync<T, E>(error)
    );

/**
 * Рендерит шаблон с плейсхолдерами вида {{key}}.
 *
 * @remarks
 * - Не выполняет код, только подстановки
 * - Не зависит от Obsidian/Dataview (чистая функция)
 * - Пустые значения превращает в пустую строку
 * - Нормализует пробелы
 */
const renderTemplate = (
    template: string,
    data: Record<string, unknown>
): string => {
    const get = (key: string): string => {
        const v = data[key];
        return v == null ? "" : String(v);
    };

    const rendered = template.replace(/\{\{\s*([^\}]+?)\s*\}\}/g, (_m, key) => get(String(key)));
    return rendered
        .replace(/\s+/g, " ")
        .replace(/\s+\./g, ".")
        .trim();
};
const normDate = (input: string): string => {
    const date = moment(input, ["YYYY-MM-DD", "DD.MM.YYYY", "DD-MM-YYYY"], true);
    if (!date.isValid())
        return input;
    return date.format("DD.MM.YYYY")
}
export const create_utils = (app: App): Utils => {
    return {
        tmpRender: renderTemplateV2,
        normDate
    }
}