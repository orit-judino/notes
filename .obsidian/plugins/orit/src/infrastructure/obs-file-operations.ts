
/**
 * Файловые операции в системе Obsidian
 */

import { AppError } from "core/types";
import { errAsync, okAsync, Result, ResultAsync } from "neverthrow";
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
            : errAsync({ type: "FolderNotFound", folderPath })
    }
    const findChild = (folder: TFolder): ResultAsync<TFile, AppError> => {
        const found = folder.children.find(
            (file): file is TFile => file instanceof TFile && file.name === fileName
        )
        return found
            ? okAsync(found)
            : errAsync({ type: "FileNotFound", folderPath, fileName })
    }
    return resolveFolder().andThen(findChild);
}



// 2. Запрашиваем объект у хранилища (Vault)
// Ищем среди прямых потомков папки
const found = af.children.find(file =>
    file instanceof TFile && file.name === fileName
);

return found instanceof TFile
    ? ok(found)
    : err(`Файл "${fileName}" не найден внутри "${folderPath}"`);
};