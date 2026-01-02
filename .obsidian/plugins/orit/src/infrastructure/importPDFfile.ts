import { App, TFile, TFolder, normalizePath, Notice } from "obsidian";
import { ResultAsync } from "neverthrow";

function pickSinglePdfViaInput(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/pdf,.pdf";
        input.multiple = false;

        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.click();
    });
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
    const path = normalizePath(folderPath);
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing && !(existing instanceof TFolder)) {
        throw new Error(`Путь существует, но это не папка: ${path}`);
    }
    if (!existing) {
        await app.vault.createFolder(path);
    }
}

function splitExt(filename: string): { base: string; ext: string } {
    const idx = filename.lastIndexOf(".");
    if (idx <= 0) return { base: filename, ext: "" };
    return { base: filename.slice(0, idx), ext: filename.slice(idx) };
}

function exists(app: App, path: string): boolean {
    return app.vault.getAbstractFileByPath(path) != null;
}

function uniquePathInFolder(app: App, folder: string, filename: string): string {
    const { base, ext } = splitExt(filename);
    let candidate = normalizePath(`${folder}/${filename}`);
    if (!exists(app, candidate)) return candidate;

    for (let i = 1; i < 10_000; i++) {
        candidate = normalizePath(`${folder}/${base} ${i}${ext}`);
        if (!exists(app, candidate)) return candidate;
    }
    throw new Error("Не удалось подобрать уникальное имя файла.");
}

export const importPdfFile = (app: App, folder: string): ResultAsync<TFile, string> => {
    return ResultAsync.fromPromise(
        (async () => {
            console.warn("folder", folder)
            // Важно: вызывай importPdfFile напрямую из handler команды/клика
            const file = await pickSinglePdfViaInput();
            if (!file) throw new Error("Файл не выбран");

            // Доп. защита (иногда type пустой)
            const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            if (!isPdf) throw new Error("Выбранный файл не PDF");

            const folderPath = normalizePath(folder);
            await ensureFolder(app, folderPath);

            const targetPath = uniquePathInFolder(app, folderPath, file.name);
            const buffer = await file.arrayBuffer();

            const created = await app.vault.createBinary(targetPath, buffer);
            new Notice(`Импортировано: ${created.path}`);
            return created;
        })(),
        (e) => `Импорт отменен или произошла ошибка: ${e instanceof Error ? e.message : String(e)}`
    );
};
