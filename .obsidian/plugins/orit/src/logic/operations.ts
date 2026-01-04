import { OritWorkflow } from "core/types";
import { ok, err, Result, ResultAsync, okAsync, errAsync } from 'neverthrow'
import { App, TFile, Notice, moment } from "obsidian";
import { PatientSchema } from "../logic/schema";

import { getActiveFile, extractByMappingFromFrontmatter, findFileInFolder, deleteTFile, renameTFile, reopenFile, closeAllTabs } from "infrastructure/obsidian-io";
import { importPdfFile } from "infrastructure/importPDFfile";




// Конфигурация 
const CONFIG = {
    paths: {
        pdf: "Эпикризы_PDF",
        patients: "Patients",
        cards: "Эпикарточки"

    },
    patientData: {
        fullName: "фио",
        birthDate: "датаРождения"
    }
} as const

export type AppConfig = typeof CONFIG;
type PatientKeys = Record<keyof typeof CONFIG.patientData, string>;
/**
 * Вспомогательные функции
 */
/**
 * Проверка существования файла по конкретному пути - в случае обнаружения - удаление.
 * @param folderPath - Папка X
 * @param fileName - Имя файла F (обязательно с расширением, например .md)
 */
const ifFindFileDelete = (
    app: App,
    folderPath: string,
    fileName: string
): ResultAsync<boolean, string> => {
    // 1. Начинаем с обычного синхронного поиска (Result)
    return findFileInFolder(app, folderPath, fileName)
        // 2. Используем "мост". Если файл найден, переходим к удалению.
        // asyncAndThen сам "распакует" TFile из Result.
        .asyncAndThen(file => deleteTFile(app, file).map(() => true))
        // 3. Обрабатываем случай, если файл НЕ был найден.
        // orElse превращает любую ошибку (в т.ч. "Файл не найден") в успех со значением false.
        .orElse(() => ok(false));
}
/**
 * Функция проверки существования файла в папке и перемещения туда заметки
 * Возвращает ResultAsync, содержащий тот же TFile для продолжения цепочки.
 */
const renameAndMovePatientNote = (
    app: App,
    file: TFile,
    config: AppConfig,
    patientKeys: PatientKeys
): ResultAsync<TFile, string> => {
    const year = moment().year().toString();
    // Формируем шаблон данных для переименования
    // 1. САНИТИЗАЦИЯ: Превращаем "Имя Фамилия" в "Имя_Фамилия"
    const safeName = patientKeys.fullName.replace(/\s+/g, '_');
    const fileNameTmp = `${safeName}_${patientKeys.birthDate}_${year}.md`
    console.warn(fileNameTmp);
    const targetFolder = config.paths.cards
    // 1. Проверяем наличие файла в папке - при наличии удаляем
    return ifFindFileDelete(app, targetFolder, fileNameTmp)
        // далее переименовыем текущую заметку
        .andThen(() => renameTFile(app, file, fileNameTmp, targetFolder))
        .andThen((file) => reopenFile(app, file))
}

/**
 * Функция создающая рабочее пространство для аннотирования pdf файла 
 * 1. Закрывает все вкладки
 * Возвращает ResultAsync, содержащий тот же TFile для продолжения цепочки.
 */
const clearUploadPDFcreateEpicris = (
    app: App
    // ): ResultAsync<TFile, string> => {
): ResultAsync<void, string> => {
    return importPdfFile(app, "Входящие")
        .map(() => { })

    // return okAsync(undefined)
}
/**
 * Главный оркестратор процесса. 
 */
export const wf: OritWorkflow = {
    runPatientCardWorkflow: async (app: App): Promise<void> => {
        const Patient_MAP = CONFIG.patientData;

        // 1. ПОЛУЧАЕМ ФАЙЛ
        // Используем Result, но сразу "распаковываем" его через match или if
        const fileResult = getActiveFile(app);
        if (fileResult.isErr()) {
            new Notice(`⚠️ ${fileResult.error}`);
            return;
        }
        const file = fileResult.value;

        // 2. ЭКСТРАКЦИЯ И ВАЛИДАЦИЯ
        // Мы объединяем эти шаги в одну логическую цепочку, так как они неразрывны
        const patientResult = extractByMappingFromFrontmatter(app, file, Patient_MAP)
            .andThen(rawData => {
                const validation = PatientSchema.safeParse(rawData);
                return validation.success
                    ? ok(validation.data)
                    : err(validation.error.issues[0]?.message ?? "Ошибка данных");
            });

        if (patientResult.isErr()) {
            new Notice(`❌ Ошибка данных пациента: ${patientResult.error}`);
            return;
        }
        const patient = patientResult.value;

        // 3. ДЕЙСТВИЕ (ПЕРЕМЕЩЕНИЕ И ПЕРЕИМЕНОВАНИЕ)
        // Здесь нам доступны и 'file', и 'patient' без всяких вложений
        const moveResult = await renameAndMovePatientNote(app, file, CONFIG, patient);

        // 4. ФИНАЛЬНЫЙ АККОРД
        moveResult.match(
            (finalFile) => {
                new Notice(`✅ Карта пациента "${finalFile.basename}" готова`);
                console.warn("Успешное перемещение:", finalFile.path);
            },
            (error) => new Notice(`⚠️ Ошибка при перемещении: ${error}`)
        );
    },
    addNewEpicrisWorkflow: async (app: App): Promise<void> => {
        const workflow = clearUploadPDFcreateEpicris(app)

        // Получаем результат
        await workflow.match(
            (file) => {
                new Notice("✅ Данные команды 2 проверены:")
            },
            (error) => {
                new Notice(`⚠️ ${error}`);
            }
        );
    },


};


