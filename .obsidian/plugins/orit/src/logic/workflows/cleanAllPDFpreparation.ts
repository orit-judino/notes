

import { ok } from "assert";
import { AppError } from "core/types";
import { closeObsAllTabs, createObsNote, openObsFile, openObsLeaf } from "infrastructure/obs-command";
import { getActiveFile } from "infrastructure/obs-file-operations";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { App, TFile } from "obsidian";

/**
 * Интерфейс контекстного объекта для передачи внутри workflow
 

/**
 * 1. Workflow - CleanAllNotes and pdf annotaion preparaation
 * 
 */
const cleanTabsOpenPdfPipeline = (app: App): ResultAsync<TFile, AppError> => {
    //уровень валидации
    // OUT? 1. Проверка на PDF - при необходимости вынестии в блок валидации
    const isPDF = (file: TFile): ResultAsync<TFile, AppError> => {
        return file.extension.toLowerCase() === "pdf"
            ? okAsync(file)
            : errAsync({
                type: "ActiveFileNotType",
                context: { fileName: file.basename, fileType: "PDF" }
            })
    }
    // void этап - выполняем последовательные подготовительбные команды
    const pipeline = closeObsAllTabs(app)
        .andThen(() => openObsFile(app))
        // source этап - пытаемся получить TFile
        .andThen(() => getActiveFile(app))
        //можно использовать напрямую 
        .andThen(isPDF)

    return pipeline;
}

const createNewTempNote = (app: App, ctx: object = {}): ResultAsync<TFile, AppError> => {
    const pipeline = openObsLeaf(app)
        .andThen(() => createObsNote(app))
        
        return okAsync({} as TFile)
}

export const createNewEpicrisisCardWorkflow = (app: App): ResultAsync<void, AppError> => {
    //1. Пайплайн скрыть вкладки и получить PDF файл
    const pdf = cleanTabsOpenPdfPipeline(app);

    const template = createNewTempNote(app, ctx);

    const workflow = pdf
        .andThen((pdf)=>template(app, {pdf: pdf}))

}