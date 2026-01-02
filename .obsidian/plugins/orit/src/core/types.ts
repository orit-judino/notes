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