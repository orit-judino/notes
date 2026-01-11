## Пример реализации функции на уровне домена

``` ts
const parezText = (hand: string | null, leg: string | null): string => {
  if (hand === null || leg === null) return "";
  if (hand === "плегия" && leg === "плегия") return "гемиплегия";
  if (hand === leg) return `гемипарез: ${hand}`;
  return `гемипарез: в руке — ${hand}, в ноге — ${leg}`;
};
```
