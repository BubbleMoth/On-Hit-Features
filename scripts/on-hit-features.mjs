// On-Hit Features: adds optional damage and follow-ups to the damage dialog.

import { MODULE_ID, FLAG, OFF, ANY, WEAPON, WEAPON_OR_UNARMED } from "./constants.mjs";
import { API } from "./report.mjs";
import { presetTrigger } from "./presets.mjs";
import { buildMasteryRow, masteryLink, postMasteryCard } from "./mastery.mjs";
import { postCleaveCard } from "./cleave.mjs";

const TRIGGERS = {
  [OFF]: "Off",
  [ANY]: "Any attack",
  [WEAPON]: "Weapon attacks only",
  [WEAPON_OR_UNARMED]: "Weapon or unarmed attacks"
};

function triggerApplies(trigger, classification) {
  if ( trigger === ANY ) return true;
  if ( trigger === WEAPON ) return classification === "weapon";
  if ( trigger === WEAPON_OR_UNARMED ) return (classification === "weapon") || (classification === "unarmed");
  return false;
}

// Store each dialog's selections with its config so the hooks can find them later.
const STATE = new WeakMap();

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "oneBonusAction", {
    name: "Only one Bonus Action feature per roll",
    hint: "Ticking a feature that takes a Bonus Action unticks any other one in the damage dialog.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "oneSpellSlot", {
    name: "Only one spell slot per roll",
    hint: "Ticking a feature that spends a spell slot unticks any other one in the damage dialog. "
      + "Free castings don't count.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "postSiblings", {
    name: "Post a feature's other activities",
    hint: "When a damage feature is used on a hit, also post a chat card for each of that item's other "
      + "activities, such as a maneuver's saving throw. They aren't paid for again, and don't start "
      + "concentration or place templates.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      off: "Off",
      maneuvers: "Maneuvers only",
      all: "All features (experimental)"
    },
    default: "maneuvers"
  });

  game.settings.register(MODULE_ID, "summaryCard", {
    name: "Post a summary card",
    hint: "After a damage roll with on-hit features, post one chat card listing every feature used, with a "
      + "link to each.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.modules.get(MODULE_ID).api = API;
});

// Temporary hand-off to the damage roll hook.
const PENDING = new WeakMap();

const GUARDED = new WeakSet();

function activityKey(ref) {
  return `${ref.item}.${ref.activity}`;
}

// null is a missing ability; undefined means we couldn't get it from the roll.
function rollAbility(rolls) {
  const base = rolls?.find(r => !r.options?.onHitFeature);
  return base?.data?.roll ? base.data.roll.ability : undefined;
}

function rollKey(rollConfig, index) {
  const ref = rollConfig.options?.onHitFeature;
  return ref ? `${activityKey(ref)}.${ref.part}` : `base.${index}`;
}

function getState(app) {
  let state = STATE.get(app.config);
  if ( !state ) {
    state = {
      selected: new Map(), slots: new Map(), rows: new Map(), inherited: new Map(), paid: null, busy: false,
      followUps: [], checks: new Set(), waiting: false
    };
    STATE.set(app.config, state);
  }
  return state;
}

// Explicitly turning a feature off overrides its preset.
function getTrigger(activity) {
  const own = activity.flags?.[MODULE_ID]?.[FLAG] ?? "";
  if ( own === OFF ) return "";
  return own || presetTrigger(activity);
}

function isFollowUp(activity) {
  return activity.type !== "damage";
}

function canUpcast(activity) {
  return activity.requiresSpellSlot && activity.consumption?.spellSlot && (activity.item.system.level > 0);
}

const isFree = choice => !!choice?.startsWith("free:");

function spendsSlot(activity, choice) {
  return canUpcast(activity) && !isFree(choice);
}

function isBonusAction(activity) {
  return activity.activation?.type === "bonus";
}

// Free castings use forward activities, which spend their own uses instead of a slot.
function getFreeCastings(activity) {
  const item = activity.item;
  const options = [];
  for ( const forward of item.system.activities ?? [] ) {
    if ( (forward.type !== "forward") || (forward.activity?.id !== activity.id) ) continue;
    const target = forward.consumption?.targets?.find(t => t.type === "itemUses");
    const source = target?.target ? activity.actor?.items.get(target.target) : item;
    const uses = source?.system.uses;
    const count = uses?.max ? ` (${uses.value}/${uses.max})` : "";
    options.push({ value: `free:${forward.id}`, label: `Free casting${count}`, disabled: !!uses?.max && (uses.value < 1) });
  }
  return options;
}

function getSlotOptions(activity) {
  const item = activity.item;
  const spells = activity.actor?.system.spells ?? {};
  const method = CONFIG.DND5E.spellcasting[item.system.method];
  const options = getFreeCastings(activity);
  for ( const [key, slot] of Object.entries(spells) ) {
    if ( !slot.max || !slot.type || (slot.level < item.system.level) ) continue;
    if ( method?.exclusive?.spells && (item.system.method !== slot.type) ) continue;
    const model = CONFIG.DND5E.spellcasting[slot.type];
    if ( model?.exclusive?.slots && (item.system.method !== slot.type) ) continue;
    const label = game.i18n.format(`DND5E.SpellLevel${slot.type.capitalize()}`, {
      level: model?.isSingleLevel ? slot.level : slot.label,
      n: slot.value
    });
    options.push({ value: key, label, disabled: !slot.value });
  }
  return options;
}

function usageConfig(activity, slot) {
  const usage = { create: false };
  if ( isFree(slot) ) {
    // Use the forward activity's cost instead of the spell slot.
    const forward = activity.item.system.activities.get(slot.slice(5));
    if ( forward ) usage.cause = { activity: forward.relativeUUID };
  }
  else if ( slot ) usage.spell = { slot };
  return activity._prepareUsageConfig(usage);
}

function scaledActivity(activity, slot) {
  const level = (slot && !isFree(slot)) ? activity.actor?.system.spells?.[slot]?.level : null;
  const scaling = level ? level - activity.item.system.level : 0;
  if ( scaling <= 0 ) return activity;
  const item = activity.item.clone({}, { keepId: true });
  // Stop actor preparation while changing the clone, then restore it.
  const actor = item.actor;
  const had = Object.hasOwn(actor, "_embeddedPreparation");
  const previous = actor._embeddedPreparation;
  actor._embeddedPreparation = true;
  try {
    item.updateSource({ "flags.dnd5e.scaling": scaling });
  } finally {
    if ( had ) actor._embeddedPreparation = previous;
    else delete actor._embeddedPreparation;
  }
  item.prepareFinalAttributes();
  return item.system.activities.get(activity.id);
}

function getOnHitActivities(attack) {
  const actor = attack.actor;
  if ( !actor ) return [];
  const classification = attack.attack?.type?.classification;
  // Chat-card rolls use a cloned weapon, so compare IDs.
  const attackItemId = attack.item?.id;
  const results = [];
  // Don't show duplicate copies of a feature.
  const seen = new Map();

  for ( const item of actor.items ) {
    // Weapon-specific features should only appear for that weapon.
    if ( (item.type === "weapon") && (item.id !== attackItemId) ) continue;
    if ( (item.type === "equipment") && !item.system.equipped ) continue;

    for ( const activity of item.system.activities ?? [] ) {
      if ( activity.type === "attack" ) continue;
      const trigger = getTrigger(activity);
      if ( !triggerApplies(trigger, classification) || !activity.canUse ) continue;
      if ( !isFollowUp(activity) && !activity.damage?.parts?.length ) continue;

      const identifier = item.system.identifier;
      const dupKey = identifier ? `${identifier}|${activity.id}` : null;
      if ( dupKey && seen.has(dupKey) ) {
        const i = seen.get(dupKey);
        if ( preferCopy(actor, item, results[i].item) ) results[i] = activity;
        continue;
      }
      if ( dupKey ) seen.set(dupKey, results.length);
      results.push(activity);
    }
  }

  return results;
}

function isConcentratingOn(actor, item) {
  for ( const effect of actor?.concentration?.effects ?? [] ) {
    if ( effect.getFlag("dnd5e", "item")?.id === item.id ) return true;
  }
  return false;
}

// Prefer the copy currently being concentrated on, then the one with more activities.
function preferCopy(actor, candidate, current) {
  const a = isConcentratingOn(actor, candidate);
  const b = isConcentratingOn(actor, current);
  if ( a !== b ) return a;
  return (candidate.system.activities?.size ?? 0) > (current.system.activities?.size ?? 0);
}

// Check the cost here without actually spending it.
async function checkAvailability(activity, slot) {
  if ( !activity.canUse ) return "Not currently available.";
  try {
    const result = await activity._prepareUsageUpdates(usageConfig(activity, slot), { returnErrors: true });
    if ( Array.isArray(result) && result.length ) return result.map(e => e.message).join(" ");
  } catch(err) {
    console.warn(`${MODULE_ID} | Couldn't check the cost of ${activity.item.name}`, err);
  }
  return null;
}

function buildRiderRolls(original, slot) {
  const activity = scaledActivity(original, slot);
  const damageConfig = activity.getDamageConfig({});
  const rolls = damageConfig.rolls ?? [];
  if ( !rolls.length ) throw new Error("it has no damage to add");

  const bonusDamage = damageConfig.critical?.bonusDamage;

  // Avoid adding the weapon bonus twice.
  const weaponBonuses = activity.item.type === "weapon"
    ? [activity.item.system.damage?.bonus, activity.item.system.damageBonus].filter(Boolean).map(String)
    : [];

  return rolls.map((roll, part) => {
    // The attack already has effect bonuses.
    roll.parts = (roll.parts ?? []).filter(p => p !== "@ruleBonus");
    if ( part === 0 ) for ( const bonus of weaponBonuses ) {
      const i = roll.parts.lastIndexOf(bonus);
      if ( i > 0 ) roll.parts.splice(i, 1);
    }

    roll.options ??= {};
    if ( (part === 0) && bonusDamage ) {
      roll.options.critical = { ...(roll.options.critical ?? {}), bonusDamage };
    }
    roll.options.flavor = activity.item.name;
    roll.options.onHitFeature = {
      item: activity.item.id,
      activity: activity.id,
      part,
      // lock always follows the weapon; default allows the player to pick another type.
      inherit: roll.options.types?.length ? "default" : "lock"
    };

    // DamageRoll changes its options, so check the formula using a clone.
    new CONFIG.Dice.DamageRoll(roll.parts.join(" + "), roll.data, foundry.utils.deepClone(roll.options));

    return roll;
  });
}

// After removing rolls, fix the roll.* form input indexes.
function remapRollInputs(form, mapping) {
  if ( !form || !mapping.size ) return;
  for ( const input of form.querySelectorAll("[name^=\"roll.\"]") ) {
    const match = input.name.match(/^roll\.(\d+)\.(.+)$/);
    if ( !match ) continue;
    const index = Number(match[1]);
    if ( !mapping.has(index) ) continue;
    const newIndex = mapping.get(index);
    if ( newIndex === null ) input.removeAttribute("name");
    else input.name = `roll.${newIndex}.${match[2]}`;
  }
}

function replaceRiderRolls(app, key, added) {
  const rolls = app.config.rolls ??= [];
  const oldKeys = rolls.map(rollKey);

  for ( let i = rolls.length - 1; i >= 0; i-- ) {
    const ref = rolls[i].options?.onHitFeature;
    if ( ref && (activityKey(ref) === key) ) rolls.splice(i, 1);
  }
  if ( added ) rolls.push(...added);

  const newIndexes = new Map(rolls.map((r, i) => [rollKey(r, i), i]));
  const mapping = new Map();
  oldKeys.forEach((k, i) => {
    const newIndex = newIndexes.get(k) ?? null;
    if ( newIndex !== i ) mapping.set(i, newIndex);
  });
  remapRollInputs(app.form, mapping);
}

// Check the cost and get the damage rows, if there are any.
async function prepareFeature(app, activity, slot, isCurrent) {
  const reason = await checkAvailability(activity, slot);
  if ( !isCurrent() ) return { ok: false };
  if ( reason ) {
    ui.notifications.warn(`${activity.item.name}: ${reason}`);
    return { ok: false };
  }
  if ( isFollowUp(activity) ) return { ok: true };
  try {
    return { ok: true, rolls: buildRiderRolls(activity, slot) };
  } catch(err) {
    console.error(`${MODULE_ID} | Couldn't add ${activity.item.name}`, err);
    ui.notifications.error(`Couldn't add ${activity.item.name}: ${err.message}. Check its damage formula.`);
    return { ok: false };
  }
}

// The checkbox check is async; rolling has to wait for it.
async function toggleRider(app, activity, checkbox) {
  const state = getState(app);
  const check = updateRider(app, activity, checkbox);
  state.checks.add(check);
  try {
    return await check;
  } finally {
    state.checks.delete(check);
  }
}

async function updateRider(app, activity, checkbox) {
  const enabled = checkbox.checked;
  const state = getState(app);
  const key = `${activity.item.id}.${activity.id}`;

  if ( state.busy || state.paid ) {
    checkbox.checked = !enabled;
    return;
  }

  if ( enabled ) {
    const slot = state.slots.get(key);
    // The choice may have changed while we were checking it.
    const isCurrent = () => checkbox.checked && app.rendered && !state.busy && !state.paid
      && (state.slots.get(key) === slot);
    const { ok, rolls } = await prepareFeature(app, activity, slot, isCurrent);
    if ( !ok ) {
      // A slot change runs its own check.
      if ( checkbox.checked && (state.slots.get(key) !== slot) ) return;
      checkbox.checked = false;
      // Remove old damage rows too if the new slot fails.
      if ( state.selected.has(key) && !state.busy && !state.paid ) {
        replaceRiderRolls(app, key, null);
        state.selected.delete(key);
        if ( app.rendered ) app.rebuild();
      }
      return;
    }
    replaceRiderRolls(app, key, rolls);
    state.selected.set(key, {
      item: activity.item.id, activity: activity.id, name: activity.item.name, followUp: isFollowUp(activity)
    });
    enforceLimits(app, key, activity);
  } else {
    dropFeature(app, key);
  }

  app.rebuild();
}

function dropFeature(app, key) {
  const state = getState(app);
  replaceRiderRolls(app, key, null);
  state.selected.delete(key);
  for ( const k of state.inherited.keys() ) if ( k.startsWith(`${key}.`) ) state.inherited.delete(k);
  const row = state.rows.get(key);
  if ( row ) row.checkbox.checked = false;
}

function enforceLimits(app, key, activity) {
  const state = getState(app);
  const oneBonus = game.settings.get(MODULE_ID, "oneBonusAction") && isBonusAction(activity);
  const oneSlot = game.settings.get(MODULE_ID, "oneSpellSlot") && spendsSlot(activity, state.slots.get(key));
  if ( !oneBonus && !oneSlot ) return;
  const dropped = { bonus: [], slot: [] };
  for ( const other of Array.from(state.selected.keys()) ) {
    if ( other === key ) continue;
    const row = state.rows.get(other);
    if ( !row ) continue;
    const bonus = oneBonus && isBonusAction(row.activity);
    const slot = oneSlot && spendsSlot(row.activity, state.slots.get(other));
    if ( !bonus && !slot ) continue;
    dropFeature(app, other);
    (bonus ? dropped.bonus : dropped.slot).push(row.activity.item.name);
  }
  if ( dropped.bonus.length ) {
    ui.notifications.info(`Only one Bonus Action feature at a time. Unticked: ${dropped.bonus.join(", ")}.`);
  }
  if ( dropped.slot.length ) {
    ui.notifications.info(`Only one spell slot at a time. Unticked: ${dropped.slot.join(", ")}.`);
  }
}

async function changeSlot(app, activity, select, checkbox) {
  const state = getState(app);
  const key = `${activity.item.id}.${activity.id}`;
  if ( state.busy || state.paid ) {
    select.value = state.slots.get(key) ?? select.value;
    return;
  }
  state.slots.set(key, select.value);
  if ( checkbox.checked ) await toggleRider(app, activity, checkbox);
  updateHint(app, activity, select.closest(".on-hit-option"));
}

function hintText(app, activity) {
  const state = getState(app);
  const key = `${activity.item.id}.${activity.id}`;
  const shown = scaledActivity(activity, state.slots.get(key));
  const uses = activity.uses?.max ? activity.uses : null;
  const effect = isFollowUp(activity)
    ? shown.labels?.save
    : (shown.labels?.damage ?? []).map(d => d.label ?? d.formula).filter(Boolean).join(", ");
  return [effect, activity.labels?.activation, uses ? `${uses.value}/${uses.max}` : null]
    .filter(Boolean).join(" · ");
}

function updateHint(app, activity, label) {
  const hint = label?.querySelector(".hint");
  if ( hint ) hint.textContent = hintText(app, activity);
}

function buildOption(app, activity) {
  const item = activity.item;
  const state = getState(app);
  const key = `${item.id}.${activity.id}`;

  const label = document.createElement("label");
  label.classList.add("on-hit-option");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox"; // No name: keep this out of the system's form data.
  checkbox.checked = state.selected.has(key);
  checkbox.addEventListener("change", event => {
    event.stopPropagation(); // toggleRider rebuilds after updating the config.
    toggleRider(app, activity, checkbox);
  });

  const img = document.createElement("img");
  img.src = item.img;
  img.alt = "";

  const name = document.createElement("span");
  name.classList.add("name");
  name.textContent = (item.system.activities?.size > 1) ? `${item.name}: ${activity.name}` : item.name;

  const hint = document.createElement("span");
  hint.classList.add("hint");

  label.append(checkbox, img, name);
  state.rows.set(key, { activity, checkbox });

  let select;
  if ( canUpcast(activity) ) {
    const options = getSlotOptions(activity);
    if ( !state.slots.has(key) ) {
      const first = options.find(o => !o.disabled) ?? options[0];
      if ( first ) state.slots.set(key, first.value);
    }
    if ( options.length ) {
      select = document.createElement("select");
      select.classList.add("slot");
      select.title = "Spell slot";
      for ( const o of options ) {
        const option = new Option(o.label, o.value, false, o.value === state.slots.get(key));
        option.disabled = o.disabled;
        select.append(option);
      }
      select.addEventListener("change", event => {
        event.stopPropagation();
        changeSlot(app, activity, select, checkbox);
      });
      label.append(select);
    }
  }

  label.append(hint);
  hint.textContent = hintText(app, activity);

  checkAvailability(activity, state.slots.get(key)).then(reason => {
    if ( !reason || checkbox.checked ) return;
    if ( select && Array.from(select.options).some(o => !o.disabled) ) return;
    checkbox.disabled = true;
    label.classList.add("disabled");
    label.title = reason;
  });

  return label;
}

// Refund in reverse order.
async function refundRiders(paid) {
  for ( const { activity, deltas } of [...paid].reverse() ) {
    if ( !deltas ) continue;
    try {
      await activity.refund(deltas);
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't refund ${activity.item.name}`, err);
      ui.notifications.error(`Couldn't refund ${activity.item.name}. Check its uses by hand.`);
    }
  }
}

// Pay one at a time, refunding earlier costs if anything fails.
async function payForRiders(actor, refs, slots) {
  const paid = [];

  for ( const ref of refs ) {
    const activity = actor?.items.get(ref.item)?.system.activities?.get(ref.activity);
    if ( !activity?.canUse ) {
      ui.notifications.warn(`${ref.name} is no longer available. Untick it to roll.`);
      await refundRiders(paid);
      return null;
    }

    const slot = slots.get(activityKey(ref));
    const messageConfig = {};
    let result;
    try {
      result = await activity.consume(usageConfig(activity, slot), messageConfig);
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't pay for ${ref.name}`, err);
      result = false;
    }

    if ( result === false ) {
      await refundRiders(paid);
      return null;
    }
    paid.push({ ref, activity, slot, deltas: foundry.utils.getProperty(messageConfig, "data.system.deltas") });
  }

  return paid;
}

// Catch the roll button before Foundry submits the form.
function guardSubmission(app) {
  const form = app.form;
  if ( !form || GUARDED.has(form) ) return;
  GUARDED.add(form);

  form.addEventListener("click", event => {
    const button = event.target.closest?.("button[type=\"submit\"]");
    if ( !button || !form.contains(button) ) return;
    const state = STATE.get(app.config);
    // Wait for any checkbox checks to finish before rolling.
    if ( state?.checks.size && !state.paid ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if ( !state.waiting ) waitThenSubmit(app, state, button.dataset.action);
      return;
    }
    if ( !state?.selected.size || state.paid ) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    payThenSubmit(app, state, button);
  }, { capture: true });
}

async function waitThenSubmit(app, state, action) {
  state.waiting = true;
  try {
    while ( state.checks.size ) await Promise.allSettled(Array.from(state.checks));
    await new Promise(resolve => requestAnimationFrame(resolve));
  } finally {
    state.waiting = false;
  }
  if ( !app.rendered ) return;
  const button = app.form?.querySelector(`button[type="submit"][data-action="${action}"]`)
    ?? app.form?.querySelector("button[type=\"submit\"]");
  button?.click();
}

async function payThenSubmit(app, state, button) {
  if ( state.busy ) return;
  state.busy = true;
  const form = app.form;
  const buttons = Array.from(form.querySelectorAll("button[type=\"submit\"]"));
  buttons.forEach(b => b.disabled = true);
  const actor = app.config.subject?.actor;

  let paid = null;
  try {
    paid = await payForRiders(actor, Array.from(state.selected.values()), state.slots);
  } finally {
    buttons.forEach(b => b.disabled = false);
    state.busy = false;
  }

  if ( !paid ) return;

  // If the dialog closed mid-payment, give the costs back.
  if ( !app.rendered || !form.isConnected ) {
    await refundRiders(paid);
    ui.notifications.info("The damage roll was cancelled, so on-hit costs were refunded.");
    return;
  }

  state.paid = new Set(paid.map(({ activity }) => `${activity.item.id}.${activity.id}`));
  state.followUps = paid.filter(p => p.ref.followUp);
  state.used = paid;
  state.followUps.push(...siblingActivities(paid, game.settings.get(MODULE_ID, "postSiblings")));

  // A rerender may have replaced the submit button.
  const submitter = form.contains(button) ? button
    : form.querySelector(`button[type="submit"][data-action="${button.dataset.action}"]`);
  form.requestSubmit(submitter ?? undefined);
}

const isManeuver = item => item.system.type?.subtype === "maneuver";

// Post the other activities without adding more damage or reusing forward casts.
function siblingActivities(paid, mode) {
  if ( !["maneuvers", "all"].includes(mode) ) return [];
  const used = new Set(paid.map(p => `${p.activity.item.id}.${p.activity.id}`));
  const siblings = [];
  for ( const { ref, activity, slot } of paid ) {
    if ( ref.followUp ) continue;
    if ( (mode === "maneuvers") && !isManeuver(activity.item) ) continue;
    for ( const other of activity.item.system.activities ?? [] ) {
      const key = `${other.item.id}.${other.id}`;
      if ( used.has(key) || ["damage", "forward"].includes(other.type) ) continue;
      used.add(key);
      siblings.push({ activity: other, slot, sibling: true });
    }
  }
  return siblings;
}

async function useFollowUps(paid, rollMode) {
  for ( const { activity, slot, sibling } of paid ) {
    try {
      const usage = { consume: false };
      // Only post sibling cards; no extra concentration, templates, or chained actions.
      if ( sibling ) Object.assign(usage, {
        concentration: { begin: false, end: null }, create: { measuredTemplate: false }, subsequentActions: false
      });
      if ( slot && !isFree(slot) ) usage.spell = { slot };
      await activity.use(usage, { configure: false }, { rollMode });
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't use ${activity.item.name}`, err);
      ui.notifications.error(`Couldn't use ${activity.item.name} after the damage roll.`);
    }
  }
}

function consumedText(activity, slot, deltas) {
  const actor = activity.actor;
  const parts = [];
  for ( const { keyPath, delta } of deltas?.actor ?? [] ) {
    const slotKey = keyPath.match(/^system\.spells\.(\w+)\.value$/)?.[1];
    const spells = slotKey && actor?.system.spells?.[slotKey];
    const count = Math.abs(delta) > 1 ? `${Math.abs(delta)} × ` : "";
    if ( spells?.type === "pact" ) parts.push(`${count}pact slot (level ${spells.level})`);
    else if ( spells ) parts.push(`${count}level ${spells.level} spell slot`);
    else {
      const label = dnd5e.utils.getHumanReadableAttributeLabel?.(keyPath, { actor }) ?? keyPath;
      parts.push(`${Math.abs(delta)} ${label}`);
    }
  }
  for ( const [id, changes] of Object.entries(deltas?.item ?? {}) ) {
    const item = actor?.items.get(id);
    for ( const { keyPath, delta } of changes ) {
      const n = Math.abs(delta);
      if ( keyPath === "system.quantity" ) parts.push(`${n} ${item?.name ?? "item"}`);
      else if ( !keyPath.endsWith("uses.spent") ) continue;
      else if ( item === activity.item ) parts.push(`${n} ${n === 1 ? "use" : "uses"}`);
      else parts.push(`${n} ${n === 1 ? "use" : "uses"} of ${item?.name ?? "another feature"}`);
    }
  }
  const text = parts.join(", ");
  return isFree(slot) ? `${text || "free"} (free casting)` : text;
}

function damageText(rolls) {
  const byType = new Map();
  for ( const roll of rolls ) {
    const type = roll.options?.type ?? "";
    byType.set(type, (byType.get(type) ?? 0) + (roll.total ?? 0));
  }
  return Array.from(byType, ([type, total]) => {
    const label = CONFIG.DND5E.damageTypes[type]?.label ?? CONFIG.DND5E.healingTypes[type]?.label ?? "";
    return `${total} ${label.toLowerCase()}`.trim();
  }).join(" + ");
}

const link = doc => `@UUID[${doc.uuid}]{${doc.name}}`;

function cleaveSlot(pending) {
  return pending.mastery === "cleave" ? ` <span class="cleave-damage">(not rolled)</span>` : "";
}

// Fill Cleave damage into the original summary after its roll.
async function updateCleaveSummary(rolls) {
  const cardId = rolls.find(r => r.options?.onHitCleave)?.options.onHitCleave;
  const summaryId = cardId && game.messages.get(cardId)?.getFlag(MODULE_ID, "cleaveSummary");
  const summary = summaryId && game.messages.get(summaryId);
  if ( !summary?.isOwner ) return;
  const div = document.createElement("div");
  div.innerHTML = summary.content;
  const slot = div.querySelector(".cleave-damage");
  if ( !slot ) return;
  slot.textContent = `→ ${damageText(rolls.filter(r => r.options?.onHitCleave))}`;
  await summary.update({ content: div.innerHTML });
}

function summaryEntry(cls, name, damage, rows) {
  const head = `<div class="on-hit-head"><span class="name">${name}</span>`
    + `${damage ? `<span class="damage">${damage}</span>` : ""}</div>`;
  const body = rows.filter(([, value]) => value)
    .map(([label, value]) => `<div class="on-hit-row"><span class="label">${label}</span><span>${value}</span></div>`);
  return `<div class="on-hit-entry ${cls}">${head}${body.join("")}</div>`;
}

async function postSummaryCard(attack, pending, rolls = []) {
  if ( !pending.used.length && !pending.mastery ) return;
  const rollsFor = key => rolls.filter(r => {
    const ref = r.options?.onHitFeature;
    return key ? (ref && (activityKey(ref) === key)) : !ref;
  });

  const entries = [summaryEntry("weapon", link(attack.item), damageText(rollsFor(null)), [
    ["Mastery", pending.mastery ? masteryLink(attack, pending.mastery) + cleaveSlot(pending) : ""]
  ])];
  for ( const { activity, slot, ref, deltas } of pending.used ) {
    const damage = ref.followUp ? "" : damageText(rollsFor(activityKey(ref)));
    entries.push(summaryEntry("feature", link(activity.item), damage, [
      ["Consumed", consumedText(activity, slot, deltas)]
    ]));
  }
  const total = rolls.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const content = `<div class="on-hit-summary"><div class="on-hit-title">On Hit Summary</div>${entries.join("")}`
    + `<div class="on-hit-total"><span>Total rolled</span><span class="damage">${total}</span></div></div>`;
  const data = {
    content: await foundry.applications.ux.TextEditor.implementation.enrichHTML(content),
    speaker: ChatMessage.implementation.getSpeaker({ actor: attack.actor })
  };
  // Match the damage roll's visibility.
  ChatMessage.implementation.applyMode(data, pending.rollMode);
  return ChatMessage.implementation.create(data);
}

Hooks.on("dnd5e.rollDamage", async (rolls, { subject }={}) => {
  try {
    await updateCleaveSummary(rolls ?? []);
  } catch(err) {
    console.error(`${MODULE_ID} | Couldn't add the Cleave damage to the summary card`, err);
  }
  const pending = subject && PENDING.get(subject);
  if ( !pending ) return;
  PENDING.delete(subject);
  const cleave = pending.mastery === "cleave";
  if ( pending.mastery && !cleave ) {
    try {
      await postMasteryCard(subject, pending.mastery, pending.rollMode, pending.ability);
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't post the weapon mastery card`, err);
    }
  }
  await useFollowUps(pending.followUps, pending.rollMode);
  let summary;
  if ( game.settings.get(MODULE_ID, "summaryCard") ) {
    try {
      summary = await postSummaryCard(subject, pending, rolls);
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't post the summary card`, err);
    }
  }
  // Cleave comes after this hit's summary.
  if ( cleave ) {
    try {
      await postCleaveCard(subject, pending.rollMode, summary?.id);
    } catch(err) {
      console.error(`${MODULE_ID} | Couldn't post the Cleave card`, err);
    }
  }
});

Hooks.on("renderDamageRollConfigurationDialog", (app, element) => {
  const attack = app.config?.subject;
  if ( attack?.type !== "attack" ) return;

  // Keep this outside template parts so rerenders don't replace it.
  if ( element.querySelector(".on-hit-features") ) return;
  const configPart = element.querySelector("[data-application-part=\"configuration\"]");
  if ( !configPart ) return;

  const activities = getOnHitActivities(attack);
  // Cleave damage doesn't trigger another mastery.
  const isCleave = app.config.rolls?.some(r => r.options?.onHitCleave);
  const masteryRow = isCleave ? null : buildMasteryRow(attack, getState(app), rollAbility(app.config.rolls));
  if ( !activities.length && !masteryRow ) return;

  const fieldset = document.createElement("fieldset");
  fieldset.classList.add("on-hit-features");
  const legend = document.createElement("legend");
  legend.textContent = "On Hit";
  fieldset.append(legend, ...activities.filter(a => !isFollowUp(a)).map(a => buildOption(app, a)));

  const followUps = activities.filter(isFollowUp);
  if ( followUps.length || masteryRow ) {
    const heading = document.createElement("h4");
    heading.classList.add("on-hit-heading");
    heading.textContent = "After damage";
    fieldset.append(heading, ...[masteryRow].filter(Boolean), ...followUps.map(a => buildOption(app, a)));
  }

  configPart.before(fieldset);
  guardSubmission(app);
  app.setPosition?.({ height: "auto" });
});

// Keep inherited damage types and properties matched to the weapon.
Hooks.on("dnd5e.buildDamageRollConfig", (app, config, formData, index) => {
  const ref = config.options?.onHitFeature;
  if ( !ref?.inherit ) return;

  const rolls = app.config?.rolls ?? [];
  const baseIndex = rolls.findIndex(r => !r.options?.onHitFeature);
  if ( baseIndex < 0 ) return;
  const base = rolls[baseIndex];
  const baseType = formData?.get(`roll.${baseIndex}.damageType`) || base.options?.type;
  if ( !baseType ) return;

  if ( ref.inherit === "lock" ) {
    config.options.types = [baseType];
    config.options.type = baseType;
  } else {
    if ( !config.options.types?.includes(baseType) ) return;
    const state = STATE.get(app.config);
    const key = rollKey(config, index);
    const field = `roll.${index}.damageType`;
    const chosen = formData?.get(field);
    // Don't overwrite a damage type the player picked.
    if ( chosen && (chosen !== state?.inherited.get(key)) ) return;
    config.options.type = baseType;
    if ( formData?.has(field) ) formData.set(field, baseType);
    state?.inherited.set(key, baseType);
  }

  const properties = new Set([...(config.options.properties ?? []), ...(base.options?.properties ?? [])]);
  config.options.properties = Array.from(properties);
});

// Strip added damage if the cost wasn't actually paid.
Hooks.on("dnd5e.postDamageRollConfiguration", (rolls, config) => {
  if ( !rolls?.some(r => r.options?.onHitFeature) ) return;
  const paid = STATE.get(config)?.paid ?? new Set();
  let removed = false;
  for ( let i = rolls.length - 1; i >= 0; i-- ) {
    const ref = rolls[i].options?.onHitFeature;
    if ( ref && !paid.has(activityKey(ref)) ) {
      rolls.splice(i, 1);
      removed = true;
    }
  }
  if ( removed ) ui.notifications.warn("On-hit damage was left out because its cost wasn't paid.");
});

// Hand paid follow-ups to the damage hook and keep the chosen roll visibility.
Hooks.on("dnd5e.postDamageRollConfiguration", (rolls, config, dialog, message) => {
  const state = STATE.get(config);
  if ( !config.subject || !state ) return;
  const used = state.used ?? [];
  if ( !state.followUps.length && !state.mastery && !used.length ) return;
  PENDING.set(config.subject, {
    followUps: state.followUps, mastery: state.mastery ?? null, used,
    rollMode: message?.rollMode ?? CONFIG.Dice.BasicRoll.getMessageMode(),
    ability: rollAbility(rolls)
  });
  state.followUps = [];
  state.mastery = null;
  state.used = [];
});

Hooks.on("renderActivitySheet", (app, element) => {
  const activity = app.activity;
  if ( !activity || (activity.type === "attack") ) return;
  const tab = element.querySelector(".tab[data-tab=\"time\"]");
  if ( !tab || tab.querySelector(".on-hit-trigger") ) return;

  const fieldset = document.createElement("fieldset");
  fieldset.classList.add("on-hit-trigger");
  const legend = document.createElement("legend");
  legend.textContent = "On Hit";

  const group = document.createElement("div");
  group.classList.add("form-group");
  const label = document.createElement("label");
  label.textContent = "Use on Hit";
  const fields = document.createElement("div");
  fields.classList.add("form-fields");
  const select = document.createElement("select");
  select.name = `flags.${MODULE_ID}.${FLAG}`;
  select.disabled = !app.isEditable;
  const current = activity.flags?.[MODULE_ID]?.[FLAG] ?? "";
  const preset = presetTrigger(activity);
  const defaultLabel = preset ? `Default (preset: ${TRIGGERS[preset]})` : "Default (off)";
  select.append(new Option(defaultLabel, "", false, !current));
  for ( const [value, text] of Object.entries(TRIGGERS) ) select.append(new Option(text, value, false, value === current));
  fields.append(select);

  const hint = document.createElement("p");
  hint.classList.add("hint");
  hint.textContent = (isFollowUp(activity)
    ? "Offer this in the damage roll dialog. It's used after the damage is rolled and posts its own chat card."
    : "Offer this in the damage roll dialog. Its damage is added to the attack's damage roll.")
    + (preset ? " This feature has a preset; Default uses it, Off turns it off." : "");

  group.append(label, fields, hint);
  fieldset.append(legend, group);

  const activation = tab.querySelector("fieldset");
  if ( activation ) activation.after(fieldset);
  else tab.prepend(fieldset);
});
