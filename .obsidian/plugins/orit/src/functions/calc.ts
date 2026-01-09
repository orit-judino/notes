import { Calcs } from 'core/types';
import { App, moment } from 'obsidian'




function calcAge(dateStr: string): number | null {
    if (!dateStr) return null;

    const birth = moment(dateStr, moment.ISO_8601, true);
    if (!birth.isValid()) return null;

    const today = moment();
    const age = today.diff(birth, "years");

    return age >= 0 ? age : null;
}

function formatDate(date: string): string {
    if (!date) return date;

    const m = moment(date, moment.ISO_8601, true);

    if (!m.isValid()) {
        const fallback = moment(new Date(date));
        if (!fallback.isValid()) return "";
        return fallback.format("DD.MM.YYYY");
    }

    return m.format("DD.MM.YYYY");
}

export const create_calcs = (_: App): Calcs => {
    return {
        calcAge,
        formatDate
    }
}