
/**
 * Файловые операции в системе Obsidian
 */

import { AppError } from "core/types";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { App, normalizePath, TFile, TFolder } from "obsidian";

//1. Поиск файлов
/** 
 * Получаем файл по конкретному пути.
 * @param folderPath - Папка X
 * @param fileName - Имя файла F (обязательно с расширением, например .md)
 */
export const findFileInFolder = (
    app: App,
    folderPath: string,
    fileName: string
): ResultAsync<TFile, AppError> => {
    // 1. Собираем полный путь и нормализуем его (убираем лишние слэши)
    const resolveFolder = (): ResultAsync<TFolder, AppError> => {
        const af = app.vault.getAbstractFileByPath(normalizePath(folderPath));
        return af instanceof TFolder
            ? okAsync(af)
            : errAsync({
                type: "FolderNotFound",
                context: { folderPath }
            })
    }
    const findChild = (folder: TFolder): ResultAsync<TFile, AppError> => {
        const found = folder.children.find(
            (file): file is TFile => file instanceof TFile && file.name === fileName
        )
        return found
            ? okAsync(found)
            : errAsync({
                type: "FileNotFound",
                context: { folderPath, fileName }
            })
    }
    return resolveFolder().andThen(findChild);
}


//2. Удаление TFile
/** 
 * 
 * @param app: App
 * @param file - TFile
 * @param useSystemTrash: boolean - по умолчанию true 
 */
export const deleteTFile = (
    app: App,
    file: TFile,
    useSystemTrash = true
): ResultAsync<void, AppError> => {
    return ResultAsync.fromPromise(
        app.vault.trash(file, useSystemTrash),
        (cause: unknown): AppError => ({
            type: "DeleteError",
            msg: "Ошибка при удалении файла",
            cause,
            context: { filePath: file.path }
        })
    );

};

/** 3. Перемещение файла
 * Переименовывает (или перемещает) TFile.
 * Возвращает ResultAsync, содержащий тот же TFile для продолжения цепочки.
 * Чистая обертка для переименования и перемещения файла.
 * @param newName - Только имя файла с расширением (например, "Иванов_1980.md")
 * @param newPath - Путь к целевой папке (например, "Patients")
 */
export const renameTFile = (
    app: App,
    file: TFile,
    newName: string,
    newPath: string
): ResultAsync<TFile, AppError> => {
    const targetPath = normalizePath(`${newPath}/${newName}`);

    return ResultAsync.fromPromise(
        app.vault.rename(file, targetPath).then(() => file),
        (cause: unknown) => ({
            type: "RenameMoveError",
            cause,
            context: { filePath: targetPath, newFilePath: newPath }
        })

    );
};

/**
 * Чистая обертка для получения активного файла.
 * Возвращает контейнер ResultAsync, который либо содержит файл, либо ошибку.
 */
export const getActiveFile = (app: App): ResultAsync<TFile, AppError> => {
    const file = app.workspace.getActiveFile();

    // return file instanceof TFile
    return file
        ? okAsync(file)
        : errAsync({
            type: "FileNotFound"
        });
};