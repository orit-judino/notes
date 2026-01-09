import { AppError, AppExtra } from "core/types";
import { Err, okAsync, Result, ResultAsync } from "neverthrow";
import { App, TFile } from "obsidian";
import { file } from "zod";

/**
 * Закрытие свехвкладок
 * Используем встроенную системную команду Obsidian для очистки всех вкладок.
 * Оборачиваем в Result для совместимости с нашим пайплайном.
 */
// export const closeAllTabs = (app: App): Result<void, AppError> => {
//     try {
//         const appWithComand = app as AppWithCommands
//         // Мы используем внутренний метод выполнения команд по ID
//         const commandFound = appWithComand.commands.executeCommandById('workspace:close-all-tabs');

//         if (commandFound === false) {
//             return err("Системная команда 'Закрыть все вкладки' не найдена или недоступна");
//         }

//         return ok(undefined);
//     } catch (e) {
//         return err(`Сбой при вызове системной команды: ${e instanceof Error ? e.message : String(e)}`);
//     }
// };

/**
 * вспомогательная функция по запуску команд Obsidian
 */
const runVoid = async (app: App, commandId: string): Promise<void> => {
    const appWithCommand = app as AppExtra;
    // если команда недоступна ошибка - 
    if (!appWithCommand.commands?.executeCommandById) {
        throw new Error("Obsidian commands API is unavailable");
    }
    // если команда не выполнима - ошибка
    const ok = appWithCommand.commands.executeCommandById(commandId);
    if (!ok) {
        throw new Error(`command failed: ${commandId}`)
    }
}

const runCommand = (app: App, commandId: string): ResultAsync<void, AppError> => {
    return ResultAsync.fromPromise(runVoid(app, commandId),
        (cause: unknown): AppError => ({
            type: "CommandError",
            cause,
            context: { commandId }
        })
    )
}
/**
 * Закрывает все вкладки
 * @param app 
 * @returns 
 */
export const closeObsAllTabs = (app: App): ResultAsync<void, AppError> => {
    const commandId = "workspace:close-all-tabs"
    return runCommand(app, commandId);
}

/**
 * Открываем файл 
 * @param app 
 * @returns 
 */
export const openObsFile = (app: App): ResultAsync<void, AppError> => {
    const commandId = "workspace:open-file"
    return runCommand(app, commandId);
}

/**
 * создаем новую вкладку
 * @param app 
 * @returns 
 */
export const openObsLeaf = (app: App): ResultAsync<void, AppError> => {
    const commandId = "workspace:split-vertical"
    return runCommand(app, commandId);
}

/**
 * создаем новую заметку
 * @param app 
 * @returns 
 */
export const createObsNote = (app: App): ResultAsync<void, AppError> => {
    const commandId = "workspace:split-vertical"
    return runCommand(app, commandId);
}