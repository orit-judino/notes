const api = app.plugins.plugins['orit-plugin'].api;
const { textFromDVFieldbyLink } = api.oh;
const { tmpRender } = api.utils;

const { R, P, U } = api.core;

// 1) шаблон
const tmp = textFromDVFieldbyLink(context.bound.mkb, "шаблон");

// 2) декодирование входов (всё ещё в заметке, но через универсальные парсеры)
const decoded = R.all({
  insult: P.enumNullable(["справа", "слева"])("insult", context.bound.insult),
  subtype: P.nonEmptyStringNullable()("insult_subtype", context.bound.insult_subtype),

  hand: P.intNullable()("hand", context.bound.hand),
  leg:  P.intNullable()("leg",  context.bound.leg),

  bulbarScore:   P.intInNullable([0,1,2,3])("bulbarScore", context.bound.bulbarScore),
  bulbarNgz:     P.boolish()("bulbarNgz", context.bound.bulbarNgz),
  bulbarTracheo: P.boolish()("bulbarTracheo", context.bound.bulbarTracheo),

  aphasiaScore: P.intInNullable([0,1,2,3])("aphasiaScore", context.bound.aphasiaScore),
  aphasiaType:  P.nonEmptyStringNullable()("aphasiaType", context.bound.aphasiaType),

  disartScore:          P.intInNullable([0,1,2,3])("disartScore", context.bound.disartScore),
  spasticitySeverity:   P.intInNullable([0,1,2,3])("spasticitySeverity", context.bound.spasticitySeverity),

  uroScore:  P.intInNullable([0,1,2,3])("uroScore", context.bound.uroScore),
  foley:     P.boolish()("foley", context.bound.foley),
  uroStoma:  P.boolish()("uroStoma", context.bound.uroStoma),
});

// 3) политика ошибок: мягко (рендерим даже при issues)
const dto = decoded.ok ? decoded.value : {};
const issues = decoded.ok ? [] : decoded.issues;
