Пример 1: декодер для нескольких полей
const d = Core.collect({
  side: Core.oneOf("side", context.bound.insult, ["справа", "слева"]),
  hand: Core.int("hand", context.bound.hand),
  subtype: Core.text("subtype", context.bound.insult_subtype),
});

if (!d.ok) {
  console.log(d.issues); // если нужно
}
const dto = d.ok ? d.value : { side: null, hand: null, subtype: null };

Пример 2: защитить внешний вызов
const r = Core.guard(() => textFromFMbyLink(mkb, "подтип"), "textFromFMbyLink");
if (!r.ok) return null;
const subtypeRaw = r.value;

Пример 3: собрать список строк
const blocks: string[] = [];
Core.pushIf(blocks, "что-то");
Core.pushIf(blocks, "");
// blocks содержит только непустые
