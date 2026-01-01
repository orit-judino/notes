import { OritWorkflow } from "core/types";
import { ok, err, Result, ResultAsync } from 'neverthrow'
import { App, TFile, Notice, moment } from "obsidian";
import { PatientSchema } from "../logic/schema";

import { getActiveFile, extractByMappingFromFrontmatter, findFileInFolder, deleteTFile, renameTFile, reopenFile } from "infrastructure/obsidian-io";



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
 * Главный оркестратор процесса. 
 */
export const wf: OritWorkflow = {
    runPatientCardWorkflow: async (app: App): Promise<void> => {

        const Patient_MAP = CONFIG.patientData;

        // Запускаем пайплайн
        const workflow = getActiveFile(app)
            .andThen(file => {
                return extractByMappingFromFrontmatter(app, file, Patient_MAP)
                    // Валидация данных пациента по схеме
                    .andThen(patientData => {
                        const validation = PatientSchema.safeParse(patientData)
                        return validation.success
                            ? ok(validation.data)
                            : err(validation.error.issues[0]?.message ?? "ошибка валидации данных пациента")
                    })
                    .map(patient => ({ file, patient }));
            })
            // Формируем шаблон для имени файла
            .asyncAndThen(({ file, patient }) => renameAndMovePatientNote(app, file, CONFIG, patient))
            ;

        // Получаем результат
        await workflow.match(
            (file) => {
                new Notice("✅ Данные проверены:")
                console.warn("Data", file.basename)
            },
            (error) => {
                new Notice(`⚠️ ${error}`);
            }
        );



        // new Notice("Test connection")
    }



};


