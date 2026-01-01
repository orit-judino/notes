import { OritWorkflow } from "core/types";
import { Result, ok, fail } from "../core/types";
import { App, TFile, Notice } from "obsidian";
// import { PatientSchema } from "../core/logic";


// Служеюные функции
/**
 * Универсальный экстрактор.
 * @param mapping - объект, где ключ - это имя поля в нашем коде, 
 * а значение - массив возможных имен ключей в Frontmatter.
 * mapping: { "название_в_коде": "название_в_obsidian" }
 */

/**
 * Чистая обертка для получения активного файла.
 * Возвращает контейнер Result, который либо содержит файл, либо ошибку.
 */
export const getActiveFile = (app: App): Result<TFile> => {
    const file = app.workspace.getActiveFile();

    return file instanceof TFile
        ? ok(file)
        : fail("Не удалось определить активную заметку.");
};




const extractByMapping = (
    app: App,
    file: TFile,
    mapping: Record<string, string>
): Record<string, unknown> => {
    // Получаем фронтматер (кастим к Record, чтобы TS не ругался на any)
    const frontmatter = (app.metadataCache.getFileCache(file)?.frontmatter || {}) as Record<string, unknown>;

    const result: Record<string, unknown> = {};

    // Проходим по ключам, которые мы хотим получить на выходе
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
        result[targetKey] = frontmatter[sourceKey];
    }

    return result;
};



/**
 * Главный оркестратор процесса. 
 */
export const wf: OritWorkflow = {
    runPatientCardWorkflow: async (app: App): Promise<void> => {
        //1. Получаем активную заметку
        const file = app.workspace.getActiveFile();





        new Notice("Test connection")
    }




    // // 1. Сбор данных
    // const rawData = app.metadataCache.getFileCache(file)?.frontmatter || {};

    // // 2. Валидация через Zod
    // const validation = PatientSchema.safeParse(rawData);

    // if (!validation.success) {
    //     // Берем только первую ошибку для краткости
    //     new Notice(`⚠️ ${validation.error.issues[0].message}`);
    //     return;
    // }

    // // 3. Переименование (Базовая карта)
    // const moveRes = await renamePatientFile(
    //     app,
    //     file,
    //     validation.data,
    //     "Карточки эпикризов"
    // );

    // if (!moveRes.ok) {
    //     new Notice(`❌ ${moveRes.error}`);
    //     return;
    // }

    // // 4. Создание вторичной карты (Task Manager)
    // const childRes = await createSecondaryNote(
    //     app,
    //     moveRes.value,
    //     "Templates/tempN1.md",
    //     "Карточки пациентов"
    // );

    // if (childRes.ok) {
    //     new Notice("✅ Пациент оформлен: документы связаны.");
    //     // Переключаем внимание врача на новую карточку
    //     app.workspace.getLeaf().openFile(childRes.value);
    // } else {
    //     new Notice(`⚠️ Ошибка связывания: ${childRes.error}`);
    // }
};