import { App, TFile } from "obsidian";

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Result<never> => ({ ok: false, error });

// Простая проверка, чтобы VS Code понимал типы внутри if
export const isOk = <T>(res: Result<T>): res is { ok: true; value: T } => res.ok;


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
    runPatientCardWorkflow: () => Promise<void>
}