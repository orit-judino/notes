
import { ok, err, Result, ResultAsync } from 'neverthrow'
import { App, TFile, Notice, normalizePath, TFolder } from "obsidian";
import { PatientSchema } from "../logic/schema";


// интерфейс для досутпа к недавним файлам
interface WorkspaceWithHistory {
    recentFiles?: string[];
}
// Служеюные функции


/**
 * Чистая обертка для получения активного файла.
 * Возвращает контейнер Result, который либо содержит файл, либо ошибку.
 */
export const getActiveFile = (app: App): Result<TFile, string> => {
    const file = app.workspace.getActiveFile();

    return file instanceof TFile
        ? ok(file)
        : err("Не удалось определить активную заметку.");
};

/**
 * Пытается получить файл по конкретному пути.
 * @param folderPath - Папка X
 * @param fileName - Имя файла F (обязательно с расширением, например .md)
 */
export const searchFileInFolder = (
    app: App,
    folderPath: string,
    fileName: string
): Result<TFile, string> => {
    // 1. Собираем полный путь и нормализуем его (убираем лишние слэши)
    const folder = app.vault.getAbstractFileByPath(normalizePath(folderPath));

    if (!folder || !(folder instanceof TFolder)) {
        return err(`Папка "${folderPath}" не существует`);
    }
    // 2. Запрашиваем объект у хранилища (Vault)
    // Ищем среди прямых потомков папки
    const found = folder.children.find(file =>
        file instanceof TFile && file.name === fileName
    );

    return found instanceof TFile
        ? ok(found)
        : err(`Файл "${fileName}" не найден внутри "${folderPath}"`);
};

/**
 * Удаляет конкретный TFile.
 * Чистое действие: берет объект -> возвращает результат операции.
 */
export const deleteTFile = (
    app: App,
    file: TFile,
    useSystemTrash: boolean = true
): ResultAsync<TFile, string> => {
    return ResultAsync.fromSafePromise(app.vault.trash(file, useSystemTrash).then(() => file));
};
/**
 * Пытается получить файл по конкретному пути.
 * @param folderPath - Папка X
 * @param fileName - Имя файла F (обязательно с расширением, например .md)
 */
export const findFileInFolder = (
    app: App,
    folderPath: string,
    fileName: string
): Result<TFile, string> => {
    // 1. Собираем полный путь и нормализуем его (убираем лишние слэши)
    const fullPath = normalizePath(`${folderPath}/${fileName}`);
    console.warn("fullPath", fullPath);

    // 2. Запрашиваем объект у хранилища (Vault)
    const abstractFile = app.vault.getAbstractFileByPath(fullPath);

    // 3. Проверяем: существует ли он и является ли он файлом (а не папкой)
    if (!abstractFile) {
        return err(`Файл "${fileName}" не найден в папке "${folderPath}"`);
    }

    if (!(abstractFile instanceof TFile)) {
        return err(`Путь "${fullPath}" ведет к папке, а нужен файл`);
    }

    return ok(abstractFile);
};

/**
 * Переименовывает (или перемещает) TFile.
 * Возвращает ResultAsync, содержащий тот же TFile для продолжения цепочки.
 */
/**
 * Чистая обертка для переименования и перемещения файла.
 * @param newName - Только имя файла с расширением (например, "Иванов_1980.md")
 * @param newPath - Путь к целевой папке (например, "Patients")
 */
export const renameTFile = (
    app: App,
    file: TFile,
    newName: string,
    newPath: string
): ResultAsync<TFile, string> => {

    // Склеиваем папку и имя в один полный путь
    const fullDestinationPath = normalizePath(`${newPath}/${newName}`);

    console.warn(`Переименование: ${file.path} -> ${fullDestinationPath}`);

    return ResultAsync.fromPromise(
        // Используем сформированный полный путь
        app.fileManager.renameFile(file, fullDestinationPath).then(() => file),

        (error) => `Ошибка перемещения в "${fullDestinationPath}": ${error instanceof Error ? error.message : String(error)
            }`
    );
};

/**
 * Исправленная версия: без лишних оберток и с правильным перехватом ошибок
 */
export const reopenFile = (app: App, file: TFile): ResultAsync<TFile, string> => {
    // Мы передаем в fromPromise сразу выполнение асинхронного блока
    return ResultAsync.fromPromise(
        (async () => {
            // 1. Пауза для индексации
            await new Promise(res => setTimeout(res, 150));

            // 2. Получаем лист (добавляем проверку на существование)
            const leaf = app.workspace.getMostRecentLeaf(); // Более надежный способ для активного окна
            if (!leaf) throw new Error("Не найден активный лист (вкладка)");

            // 3. Переключаем состояние
            await leaf.setViewState({
                type: "markdown",
                state: { file: file.path },
                active: true,
            });

            return file; // Возвращаем файл для продолжения цепочки
        })(), // Вызываем эту функцию немедленно
        (error) => `Ошибка при жесткой перезагрузке: ${error instanceof Error ? error.message : String(error)}`
    );
};

/**
 * Удаляет указанные пути из списка "Недавних файлов" Obsidian.
 */
export const cleanHistory = (app: App, pathsToRemove: string[]): void => {
    // 1. Приводим к нашему интерфейсу вместо any
    const workspace = app.workspace as WorkspaceWithHistory;

    // 2. Проверяем: существует ли свойство и является ли оно массивом
    if (workspace.recentFiles && Array.isArray(workspace.recentFiles)) {

        const originalLength = workspace.recentFiles.length;

        // 3. Фильтруем список
        workspace.recentFiles = workspace.recentFiles.filter(
            (path) => !pathsToRemove.includes(path)
        );

        // 4. Триггерим событие только если список реально изменился
        if (workspace.recentFiles.length !== originalLength) {
            app.workspace.trigger("recent-files-change");
            console.warn(`[HistoryCleaner] Удалено путей из истории: ${originalLength - workspace.recentFiles.length}`);
        }
    } else {
        console.warn("[HistoryCleaner] Свойство recentFiles недоступно или повреждено");
    }
};

/**
 * Универсальный экстрактор данных из фронтматтера
 * @param mapping - объект, где ключ - это имя поля в нашем коде, 
 * а значение 
 * mapping: { "название_в_коде": "название_в_obsidian" }
 */
export const extractByMappingFromFrontmatter = (
    app: App,
    file: TFile,
    mapping: Record<string, string>
): Result<Record<string, unknown>, string> => {
    // Получаем фронтматер (кастим к Record, чтобы TS не ругался на any)
    const frontmatter = (app.metadataCache.getFileCache(file)?.frontmatter || {}) as Record<string, unknown>;

    const result: Record<string, unknown> = {};

    // Проходим по ключам, которые мы хотим получить на выходе
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
        result[targetKey] = frontmatter[sourceKey];
    }

    return ok(result);
};








