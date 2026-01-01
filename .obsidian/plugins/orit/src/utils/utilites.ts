import { moment } from "obsidian";
import { Result, ok, fail } from "../core/types";



/**
 * Парсит дату и возвращает её в строгом формате DD.MM.YYYY
 */
export const normalizeDate = (input: string): Result<string> => {
    // moment() сам разберется с большинством форматов
    const date = moment(input, ["YYYY-MM-DD", "DD.MM.YYYY", "DD-MM-YYYY"], true);

    if (!date.isValid()) {
        return fail(`Неверный формат даты: ${input}`);
    }

    // Возвращаем именно то, что нам нужно для интерфейса
    return ok(date.format("DD.MM.YYYY"));
};