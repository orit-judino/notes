import { moment } from "obsidian";
import { ok, err, Result, ResultAsync, okAsync, errAsync } from 'neverthrow'


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