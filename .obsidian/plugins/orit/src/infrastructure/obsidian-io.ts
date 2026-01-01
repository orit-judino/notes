import { OritWorkflow } from "core/types";
import { App, TFile, Notice } from "obsidian";
// import { PatientSchema } from "../core/logic"; // Твоя Zod-схема




/**
 * Главный оркестратор процесса. 
 */
export const wf: OritWorkflow = {
    runPatientCardWorkflow: async (): Promise<void> => {
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