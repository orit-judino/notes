import { AppError, AppWithCommands } from "core/types";
import { okAsync, Result, ResultAsync } from "neverthrow";
import { App } from "obsidian";

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

export const closeObsAllTabs = (app: App): ResultAsync<void, AppError> => {
    const run = async () => {
        const appWithCommand = app as AppWithCommands;
        appWithCommand.commands.executeCommandById('worcspace:close-all-tabs');
    }
    return ResultAsync.fromPromise(run(),
        (cause: unknown): AppError => ({
            type: "CommandError",
            cause,
            context: { commandId: "close-all-tabs" }
        })
}