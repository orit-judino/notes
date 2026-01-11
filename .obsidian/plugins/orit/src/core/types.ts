import { App, TFile } from "obsidian";


// базовый интерфейс
export interface Note {
    path: string;
    content: string;
    basename: string;
}
export interface OritAPI {
    calcs: Calcs
    oh: ObsHelper
    utils: Utils
    mbui: MetabindUI
    // wf: OritWorkflow
}
export interface Calcs {
    calcAge: (data: string) => number | null;
    formatDate: (date: string) => string;
}
export interface Utils {
    tmpRender: (tmp: string, data: Record<string, unknown>) => string;
    normDate: (input: string) => string;
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
export interface MetabindUI {
    inlineSelectFromFM: (spec: { link: unknown, fmKey: string, label: string, saveTo: string, readFromFMByLink: (link: string, key: string) => unknown }) => string | null;
}
export interface ObsHelper {
    textFromDVFieldbyLink: (link: string, dvField: string) => string;
    textFromFMbyLink: (link: string, dvField: string) => string;
}
/**
 * Описываем структуру внутренней системы команд Obsidian
 */
export interface CommandManager {
    executeCommandById(id: string): boolean;
}
export type PluginsLike = {
    plugins: Record<string, unknown>;
}
/**
 * Расширяем стандартный App, добавляя в него скрытое свойство commands
 */

export interface AppExtra extends App {
    commands: CommandManager;
    plugins: PluginsLike;
}


/**
 * Универсальный тип описания ошибок в системе
 */
type AppErrorBase<T extends string, Ctx extends object> = {
    type: T;
    msg?: string;
    cause?: unknown;
    context?: Ctx
}/**
 * Вспомогательные типы для описнаия ошибок
 */
export type ObsFileType = "PDF" | "MD" | "DOC"
/**
 * Дискрпимаинационные типы расширения базовго типа ошибок для их специализации
 */
export type AppError =
    | AppErrorBase<"FileNotFound", { folderPath?: string; fileName?: string; }>
    | AppErrorBase<"ActiveFileNotFound", { fileName?: string }>
    | AppErrorBase<"ActiveFileNotType", { fileName: string, fileType: ObsFileType }>
    | AppErrorBase<"FolderNotFound", { folderPath?: string; }>
    | AppErrorBase<"DeleteError", { filePath?: string; }>
    | AppErrorBase<"RenameMoveError", { filePath: string; newFilePath: string }>
    | AppErrorBase<"CommandError", { commandId: string }> // ошибка выполнения команды Obsidian
