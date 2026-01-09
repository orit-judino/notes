---
dob: 1981-10-21
age: 44
---


Возраст: `VIEW[calcAge({dob})][math:age]`

Вариант динамического просмотра 
```meta-bind-js-view
{options} as options
{ds_options} as ds_option
{ds} as ds
---
const dv = app.plugins.plugins.dataview?.api;
const {oh} = app.plugins.plugins["orit-plugin"]?.api
if (!dv) return engine.markdown.create("Dataview не найден.");
const ds = context.bound.ds
console.log("ds", ds)

const path = oh.toPathNoMD(ds)
const p = dv.page(path)
const opt = p.бассейн || []
console.log(path)
const basoptions = opt.map(x=> `option(${x})`).join(", ");
const options = context.bound.options.map(x => `option(${x})`).join(", ");
const str = `\`INPUT[inlineSelect(${options}):selected]\``;
const str2 = `\`INPUT[inlineSelect(${basoptions}):selected]\``;
return engine.markdown.create(str2);
```

