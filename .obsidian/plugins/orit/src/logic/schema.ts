import { z } from 'zod';
import { Result, ok, fail } from '../utils/fp';
import { normalizeDate } from '../utils/utilites';
import { moment } from 'obsidian';


const PATIENT_CONFIG = {
    MIN_AGE: 18,
    MAX_AGE: 95,
    DATE_FORMAT: "DD.MM.YYYY"
} as const;

export const PatientSchema = z.object({
    fullName: z.string()
        .trim()
        .refine(val => val.split(/\s+/).filter(Boolean).length >= 2, {
            message: "Введите Фамилию и Имя"
        }),

    birthDate: z.string()
        .transform((val, ctx) => {
            const res = normalizeDate(val);
            if (!res.ok) {
                ctx.addIssue({
                    code: "custom",
                    message: "Неверный формат даты"
                });
                return z.NEVER;
            }
            return res.value;
        })
        .refine(dateStr => {
            const age = moment().diff(moment(dateStr, PATIENT_CONFIG.DATE_FORMAT), 'years');
            return age >= PATIENT_CONFIG.MIN_AGE && age <= PATIENT_CONFIG.MAX_AGE;
        }, {
            message: `Возраст пациента вне диапазона ${PATIENT_CONFIG.MIN_AGE}-${PATIENT_CONFIG.MAX_AGE} лет`
        })
});