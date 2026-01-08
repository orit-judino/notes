// Scripts/meta-bind-mathjs.js
const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;
globalThis.mbUI = await engine.importJs("Scripts/inlinesuggester.js");

/**
 * parseDOB(input) -> Date | null
 * Поддержка:
 * - "DD.MM.YYYY" / "D.M.YYYY"
 * - "YYYY-MM-DD"
 * - ISO ("YYYY-MM-DDTHH:mm:ssZ")
 * - timestamp (миллисекунды) или число/строка-число
 */
function parseDOB(input) {
    if (input === null || input === undefined) return null;

    // numbers / numeric strings as timestamp (ms)
    if (typeof input === 'number' && Number.isFinite(input)) {
        const d = new Date(input);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const s = String(input).trim();
    if (!s) return null;

    if (/^\d+$/.test(s)) {
        const ms = Number(s);
        if (Number.isFinite(ms)) {
            const d = new Date(ms);
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }

    // DD.MM.YYYY or D.M.YYYY
    let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        // создаём локальную дату в полдень, чтобы минимизировать проблемы с DST
        const d = new Date(year, month - 1, day, 12, 0, 0, 0);
        // проверка валидности (чтобы 31.02 не “прокатило”)
        if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
        return null;
    }

    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const d = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
        return null;
    }

    // Fallback: Date.parse for ISO and other parseable formats
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
        const d = new Date(t);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
}

/**
 * calcAge(dob, asOf = Date.now()) -> number | null
 * Возвращает полных лет. Если dob не распознан — null.
 */
function calcAge(dob, asOf = Date.now()) {
    const birth = parseDOB(dob);
    const now = parseDOB(asOf) ?? new Date(asOf);

    if (!birth || Number.isNaN(now.getTime())) return null;

    let age = now.getFullYear() - birth.getFullYear();

    // если ДР в этом году ещё не наступил — минус 1
    const mNow = now.getMonth();
    const dNow = now.getDate();
    const mBirth = birth.getMonth();
    const dBirth = birth.getDate();

    if (mNow < mBirth || (mNow === mBirth && dNow < dBirth)) age -= 1;

    // защита от будущих дат рождения
    if (age < 0) return null;

    return age;
}

mb.mathJSImport({
    calcAge,
});
