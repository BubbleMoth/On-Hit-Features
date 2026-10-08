// Show 2024 weapon masteries in the damage dialog, then post their activity cards.

import { MODULE_ID } from "./constants.mjs";
import { MASTERY_TEMPLATES, TEMPLATE_IMG } from "./mastery-templates.mjs";
import { cleaveDamage } from "./cleave.mjs";

// Graze works on misses and Nick changes the Light extra attack, so skip those.
const ON_HIT_MASTERIES = new Set([...Object.keys(MASTERY_TEMPLATES), "cleave"]);

// Show the selected mastery first, followed by any other masteries this attack can use.
export function getMasteryOptions(attack) {
  if ( attack.attack?.type?.classification !== "weapon" ) return [];
  const options = (attack.item.system.masteryOptions ?? []).filter(o => ON_HIT_MASTERIES.has(o.value));
  const last = attack.item.getFlag("dnd5e", `last.${attack.id}.mastery`);
  const i = options.findIndex(o => o.value === last);
  if ( i > 0 ) options.unshift(...options.splice(i, 1));
  return options;
}

function masteryLabel(key) {
  return CONFIG.DND5E.weaponMasteries[key]?.label ?? key;
}

// Use the ability from the roll if we have it. Shillelagh can leave it blank and put the modifier in the bonus.
function abilityMod(attack, ability) {
  const abilities = attack.actor?.system.abilities ?? {};
  const key = (ability !== undefined) ? ability : attack.ability;
  if ( key && abilities[key] ) return abilities[key].mod;
  return dnd5e.utils.simplifyBonus(attack.attack?.bonus, attack.getRollData({ deterministic: true }));
}

function masteryDC(attack, ability) {
  return 8 + abilityMod(attack, ability) + (attack.actor?.system.attributes?.prof ?? 0);
}

function masteryHint(attack, key, ability) {
  if ( key === "topple" ) return `CON save DC ${masteryDC(attack, ability)} or Prone`;
  if ( key === "push" ) return "Push up to 10 ft";
  if ( key === "cleave" ) return `Attack another creature within 5 ft · ${cleaveDamage(attack)}, no ability modifier`;
  return MASTERY_TEMPLATES[key]?.effects[0]?.name ?? "";
}

// Check for one of our tagged activities first, then a matching Weapon Mastery activity.
function findOwnActivity(actor, key) {
  const label = masteryLabel(key).toLowerCase();
  let byName = null;
  for ( const item of actor?.items ?? [] ) {
    for ( const activity of item.system.activities ?? [] ) {
      if ( activity.flags?.[MODULE_ID]?.mastery === key ) return activity;
      if ( !byName && (item.system.identifier === "weapon-mastery") && (activity.name?.toLowerCase() === label) ) {
        byName = activity;
      }
    }
  }
  return byName;
}

// Make a temporary item so the chat card's save and effect buttons still work.
function templateItem(attack, key, ability) {
  const template = MASTERY_TEMPLATES[key];
  if ( !template ) return null;
  const activity = foundry.utils.deepClone(template.activity);
  if ( key === "topple" ) activity.save.dc = { calculation: "", formula: String(masteryDC(attack, ability)) };
  return new Item.implementation({
    _id: foundry.utils.randomID(),
    name: `Weapon Mastery: ${masteryLabel(key)}`,
    type: "feat",
    img: TEMPLATE_IMG,
    system: { type: { value: "class" }, activities: { [activity._id]: activity } },
    effects: foundry.utils.deepClone(template.effects)
  }, { parent: attack.actor });
}

export function buildMasteryRow(attack, state, ability) {
  const options = getMasteryOptions(attack);
  if ( !options.length ) return null;
  // Cleave needs another target, so don't preselect it.
  if ( state.mastery === undefined ) state.mastery = (options[0].value === "cleave") ? null : options[0].value;

  const label = document.createElement("label");
  label.classList.add("on-hit-option", "on-hit-mastery");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox"; // No name: keep this out of the system's form data.
  checkbox.checked = !!state.mastery;

  const img = document.createElement("img");
  img.src = TEMPLATE_IMG;
  img.alt = "";

  const name = document.createElement("span");
  name.classList.add("name");
  name.textContent = "Weapon Mastery";

  const hint = document.createElement("span");
  hint.classList.add("hint");

  let chosen = state.mastery ?? options[0].value;
  const refresh = () => hint.textContent = masteryHint(attack, chosen, ability);
  label.append(checkbox, img, name);

  if ( options.length > 1 ) {
    const select = document.createElement("select");
    select.classList.add("slot");
    for ( const o of options ) select.append(new Option(o.label, o.value, false, o.value === chosen));
    select.addEventListener("change", event => {
      event.stopPropagation();
      if ( state.busy || state.paid ) {
        select.value = chosen;
        return;
      }
      chosen = select.value;
      if ( checkbox.checked ) state.mastery = chosen;
      refresh();
    });
    label.append(select);
  } else {
    name.textContent = `Weapon Mastery: ${options[0].label}`;
  }

  checkbox.addEventListener("change", event => {
    event.stopPropagation();
    if ( state.busy || state.paid ) {
      checkbox.checked = !checkbox.checked;
      return;
    }
    state.mastery = checkbox.checked ? chosen : null;
  });

  label.append(hint);
  refresh();
  return label;
}

export function masteryLink(attack, key) {
  const label = masteryLabel(key);
  const uuid = findOwnActivity(attack.actor, key)?.item.uuid ?? CONFIG.DND5E.weaponMasteries[key]?.reference;
  return uuid ? `@UUID[${uuid}]{${label}}` : label;
}

// Use the character's activity if possible, or our template if they don't have one.
export async function postMasteryCard(attack, key, rollMode, ability) {
  // Just post the card; don't charge resources or start any extra actions.
  const usage = {
    consume: false, concentration: { begin: false, end: null }, create: { measuredTemplate: false },
    subsequentActions: false
  };
  const own = findOwnActivity(attack.actor, key);
  if ( own ) return own.use(usage, { configure: false }, { rollMode });

  const item = templateItem(attack, key, ability);
  const activity = item?.system.activities.contents[0];
  if ( !activity ) return;
  return activity.use(usage, { configure: false }, {
    rollMode, data: { flags: { dnd5e: { item: { data: item.toObject() } } } }
  });
}
