
// Cleave reposts the weapon card for a second target. Range and once-per-turn are left to the player.

import { MODULE_ID } from "./constants.mjs";

// Other damage bonuses are still added when the actual damage is rolled.
export function cleaveDamage(attack) {
  const item = attack.item;
  const base = item.system.damage?.base;
  const parts = [];
  if ( base?.number && base?.denomination ) parts.push(`${base.number}d${base.denomination}`);
  const magic = Number(item.system.magicalBonus) || 0;
  if ( magic && item.system.magicAvailable ) parts.push(magic);
  const mod = attack.actor?.system.abilities?.[attack.ability]?.mod ?? 0;
  if ( mod < 0 ) parts.push(mod);
  const formula = parts.join(" + ").replace(/\+ -/g, "- ");
  const type = CONFIG.DND5E.damageTypes[base?.types?.first?.()]?.label?.toLowerCase() ?? "";
  return `${formula} ${type}`.trim();
}

export function postCleaveCard(attack, rollMode, summaryId) {
  return attack.use({
    consume: false, concentration: { begin: false, end: null }, create: { measuredTemplate: false },
    subsequentActions: false
  }, { configure: false }, {
    rollMode, data: { flags: { [MODULE_ID]: { cleave: true, cleaveSummary: summaryId ?? null } } }
  });
}

const next = { attack: null, damage: null };

function addBadge(html) {
  if ( html.querySelector(".on-hit-cleave-badge") ) return;
  const badge = document.createElement("span");
  badge.classList.add("on-hit-cleave-badge");
  badge.dataset.tooltip = "Weapon Mastery: Cleave";
  badge.innerHTML = "<i class=\"fa-solid fa-axe\" inert></i> Cleave";
  const sender = html.querySelector(".message-header .message-sender");
  if ( sender ) sender.after(badge);
  else html.prepend(badge);
}

// The card flag is true; the attack and damage rolls store that card's ID.
Hooks.on("dnd5e.renderChatMessage", (message, html) => {
  const flag = message.getFlag(MODULE_ID, "cleave");
  if ( !flag ) return;
  addBadge(html);
  if ( flag !== true ) return;

  const attack = message.getAssociatedActivity?.();
  if ( !attack ) return;

  if ( !html.querySelector(".on-hit-cleave-note") ) {
    const note = document.createElement("div");
    note.classList.add("on-hit-cleave-note");
    note.innerHTML = "<strong>Cleave:</strong> target another creature within 5 ft of the first, then roll "
      + `Attack. On a hit, Damage rolls ${cleaveDamage(attack)} without your ability modifier.`;
    const buttons = html.querySelector(".chat-card .icon-row, .card-buttons");
    if ( buttons ) buttons.before(note);
    else html.querySelector(".message-content")?.prepend(note);
  }

  html.addEventListener("click", event => {
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    const kind = { rollAttack: "attack", rollDamage: "damage" }[action];
    if ( !kind ) return;
    next[kind] = { card: message.id, activity: attack.uuid };
    // Clear this after the click so it doesn't carry over to another roll.
    setTimeout(() => next[kind] = null, 0);
  }, { capture: true });
});

function takeCleave(kind, config) {
  const cleave = next[kind];
  if ( !cleave || (config.subject?.uuid !== cleave.activity) ) return null;
  next[kind] = null;
  return cleave;
}

function markMessage(message, cleave, flavor) {
  foundry.utils.setProperty(message, "data.flavor", flavor);
  foundry.utils.setProperty(message, `data.flags.${MODULE_ID}.cleave`, cleave.card);
}

Hooks.on("dnd5e.preRollAttackV2", (config, dialog, message) => {
  const cleave = takeCleave("attack", config);
  if ( cleave ) markMessage(message, cleave, `${config.subject.item.name} - Cleave Attack`);
});

Hooks.on("dnd5e.preRollDamageV2", (config, dialog, message) => {
  const cleave = takeCleave("damage", config);
  if ( !cleave ) return;
  for ( const roll of config.rolls ?? [] ) {
    roll.options ??= {};
    roll.options.onHitCleave = cleave.card;
    // Cleave still keeps negative ability modifiers.
    if ( roll.base && ((roll.data?.mod ?? 0) > 0) ) roll.parts = (roll.parts ?? []).filter(p => p !== "@mod");
  }
  markMessage(message, cleave, `${config.subject.item.name} - Cleave Damage`);
});

Hooks.on("renderDamageRollConfigurationDialog", (app, element) => {
  if ( !app.config.rolls?.some(r => r.options?.onHitCleave) ) return;
  if ( element.querySelector(".on-hit-cleave-banner") ) return;
  const banner = document.createElement("div");
  banner.classList.add("on-hit-cleave-banner");
  banner.innerHTML = "<i class=\"fa-solid fa-axe\" inert></i> <strong>Cleave damage</strong>: "
    + "your ability modifier is left out (unless it's negative).";
  (element.querySelector("form") ?? element.querySelector(".window-content"))?.prepend(banner);
});
