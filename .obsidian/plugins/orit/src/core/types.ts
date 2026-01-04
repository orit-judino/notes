import { App, TFile } from "obsidian";



// базовый интерфейс
export interface Note {
    path: string;
    content: string;
    basename: string;
}
export interface Calcs {
    calcAge: (data: string) => number | null;
    formatDate: (date: string) => string;
}
/**
 * Интерфейс для всех оркестраторов процессов в плагине.
 */
export interface OritWorkflow {
    /**
     * Запускает цепочку действий для карточки пациента.
     * @param app - экземпляр приложения Obsidian
     * @param file - файл, над которым совершается действие
     */
    runPatientCardWorkflow: (app: App) => Promise<void>;
    addNewEpicrisWorkflow: (app: App) => Promise<void>;

}
type AppErrorBase<T extends string, Ctx extends object> = {
    type: T;
    msg?: string;
    cause?: unknown;
    context?: Ctx
}
export type AppError =
    | AppErrorBase<"FileNotFound", { folderPath?: string; fileName?: string; }>
    | AppErrorBase<"FolderNotFound", { folderPath?: string; }>
    | AppErrorBase<"DeleteError", { filePath?: string; }>
    | AppErrorBase<"RenameMoveError", {filePath: string; newFilePath: string}>
