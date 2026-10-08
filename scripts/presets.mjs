import { MODULE_ID, FLAG, ANY, WEAPON, WEAPON_OR_UNARMED } from "./constants.mjs";

// Defaults for the 2024 SRD and PHB versions of these features.
// These only affect the damage dialog, nothing gets written back to the item.
// Anything set on the activity sheet (even Off) takes priority.
//
// The rules bits are ideas for later: autoSelect, exclusive, and when aren't checked yet.
// Once-per-turn stuff is also left to the feature's uses or another module.

// 2024 smites work with melee weapons and unarmed strikes.
const smite = (id, label, activityId) => ({
  id, label, identifier: id, trigger: WEAPON_OR_UNARMED, activities: [{ id: activityId }]
});
const maneuver = (id, label, activityId) => ({
  id, label, identifier: id, trigger: ANY, activities: [{ id: activityId }]
});

export const PRESETS = [
  // Rogue
  { id: "sneak-attack", label: "Sneak Attack", identifier: "sneak-attack", trigger: WEAPON,
    activities: [{ id: "a1T6nHaqmvbLpyJr" }], rules: { when: { weapon: ["fin", "ranged"] } } },
  { id: "assassinate", label: "Assassinate", identifier: "assassinate", trigger: WEAPON,
    activities: [{ id: "xF68xROGwfOkEY7f" }], rules: { when: { firstRound: true } } },

  // Concentration spells
  { id: "hunters-mark", label: "Hunter's Mark", identifier: "hunters-mark", trigger: ANY,
    activities: [{ id: "dnd5eactivity000", name: "Bonus Mark Damage" }],
    rules: { autoSelect: true, when: { concentrating: true, targetMarked: true } } },
  { id: "hex", label: "Hex", identifier: "hex", trigger: ANY,
    activities: [{ id: "dnd5eactivity000", name: "Bonus Hex Damage" }],
    rules: { autoSelect: true, when: { concentrating: true, targetMarked: true } } },
  { id: "great-old-one-hex", label: "Hex (Powerful)", identifier: "great-old-one-hex", trigger: ANY,
    activities: [{ id: "dnd5eactivity000", name: "Bonus Hex Damage" }],
    rules: { autoSelect: true, when: { concentrating: true, targetMarked: true } } },
  { id: "conjure-minor-elementals", label: "Conjure Minor Elementals", identifier: "conjure-minor-elementals",
    trigger: ANY, activities: [{ id: "dnd5eactivity000", name: "Bonus Attack Damage" }],
    rules: { autoSelect: true, when: { concentrating: true } } },

  // Smites (with the spell slot picker)
  { id: "divine-smite", label: "Divine Smite", identifier: "divine-smite", trigger: WEAPON_OR_UNARMED,
    activities: [{ id: "dnd5eactivity200", name: "Cast" }, { id: "dnd5eactivity000", name: "Unholy Creature Damage" }],
    rules: { exclusive: true } },
  smite("searing-smite", "Searing Smite", "M4KS57lcf4K6fUMU"),
  smite("shining-smite", "Shining Smite", "dnd5eactivity000"),
  smite("thunderous-smite", "Thunderous Smite", "dnd5eactivity000"),
  smite("wrathful-smite", "Wrathful Smite", "7g4z2R5Xozd8TESe"),
  smite("blinding-smite", "Blinding Smite", "dnd5eactivity000"),
  smite("staggering-smite", "Staggering Smite", "AMwFB1wsbzWYakK4"),
  smite("banishing-smite", "Banishing Smite", "CXmmXBTfen6D6LXY"),

  // Warlock
  { id: "eldritch-smite", label: "Eldritch Smite", identifier: "eldritch-smite", trigger: WEAPON,
    activities: [{ id: "CXJlzDUkMYU9w9i9", name: "Smite" }] },
  { id: "lifedrinker", label: "Lifedrinker", identifier: "lifedrinker", trigger: WEAPON,
    activities: [{ id: "LDIKT3JVs25qBVuL" }] },

  // Ranger
  { id: "hunters-prey", label: "Hunter's Prey: Colossus Slayer", identifier: "hunters-prey", trigger: WEAPON,
    activities: [{ id: "Ek6m8ZY5Df7Mp6DO" }], rules: { when: { targetBelowMax: true } } },
  { id: "dread-ambusher", label: "Dread Ambusher: Dreadful Strike", identifier: "dread-ambusher", trigger: WEAPON,
    activities: [{ id: "DMVf7FTyTC2HCAf9", name: "Dreadful Strike" }] },
  { id: "dreadful-strikes", label: "Dreadful Strikes", identifier: "dreadful-strikes", trigger: WEAPON,
    activities: [{ id: "KazABqojM9ox0enm" }] },

  // Barbarian
  { id: "frenzy", label: "Frenzy", identifier: "frenzy", trigger: ANY, activities: [{ id: "myPBq8xozti108Mc" }],
    rules: { autoSelect: true, when: { myTurn: true, effects: ["Rage", "Reckless"] } } },
  { id: "brutal-strike", label: "Brutal Strike", identifier: "brutal-strike", trigger: ANY,
    activities: [{ id: "nN5gsB6AcSQ4uQPN", name: "Brutal Strike" }],
    rules: { when: { myTurn: true, effects: ["Reckless"] } } },
  { id: "divine-fury", label: "Divine Fury", identifier: "divine-fury", trigger: ANY,
    activities: [{ id: "LAMSQQ3i8NNzanUw", name: "Divine Fury" }],
    rules: { autoSelect: true, when: { myTurn: true, effects: ["Rage"] } } },

  // Cleric and Druid
  { id: "blessed-strikes-divine-strike", label: "Divine Strike", identifier: "blessed-strikes-divine-strike",
    trigger: WEAPON,
    // PHB combines both damage types, while the SRD splits them into two choices.
    activities: [{ id: "uYVz8MBW0EZ2X0zD" }, { id: "MbCGfaQAeW2rzNWb", optional: true, rules: { autoSelect: false } }],
    rules: { autoSelect: true, exclusive: true, when: { myTurn: true } } },
  { id: "elemental-fury-primal-strike", label: "Primal Strike", identifier: "elemental-fury-primal-strike",
    trigger: WEAPON, activities: [{ id: "lHdiTksQmeJBFrf7", name: "Primal Strike" }],
    rules: { autoSelect: true, when: { myTurn: true } } },
  { id: "lunar-form", label: "Lunar Form", identifier: "lunar-form", trigger: WEAPON,
    activities: [{ id: "1MWIOnDOZdrrCRw5" }] },

  // Monk
  { id: "hand-of-harm", label: "Hand of Harm", identifier: "hand-of-harm", trigger: ANY,
    activities: [{ id: "3LBCmLni9BQUpgcv" }] },
  { id: "elemental-epitome", label: "Elemental Epitome: Empowered Strike", identifier: "elemental-epitome",
    trigger: ANY, activities: [{ id: "a5WGe405dvalmJKa", name: "Empowered Strike" }],
    rules: { when: { myTurn: true } } },

  // Fighter
  { id: "psionic-strike", label: "Psionic Strike", identifier: "psionic-power", trigger: ANY,
    activities: [{ id: "FxJXB4BPlBnJLF7q", name: "Psionic Strike" }], requireActivity: true,
    rules: { when: { myTurn: true } } },
  maneuver("trip-attack", "Trip Attack", "vOstpOszbeITGlUP"),
  maneuver("menacing-attack", "Menacing Attack", "DCKmEG3Vy2gvxpKH"),
  maneuver("pushing-attack", "Pushing Attack", "E8n2vBez77Swvt8l"),
  maneuver("disarming-attack", "Disarming Attack", "mlUC7IiS8ZyTvDpZ"),
  maneuver("distracting-strike", "Distracting Strike", "DBgCFax1iS3mobyw"),
  maneuver("goading-attack", "Goading Attack", "IxCIr1UxK0rqi5De"),
  maneuver("maneuvering-attack", "Maneuvering Attack", "y91hZshSUPoqsrpq"),

  // Feats and species
  { id: "great-weapon-master", label: "Great Weapon Master", identifier: "great-weapon-master", trigger: WEAPON,
    activities: [{ id: "nmwSlK1gwZ1nfxKa", name: "Heavy Weapon Damage" }],
    rules: { autoSelect: true, when: { myTurn: true, weapon: ["hvy"] } } },
  { id: "charger", label: "Charger", identifier: "charger", trigger: ANY,
    activities: [{ id: "54afnEMKfBkQaByQ", name: "Charge Attack" }], rules: { when: { myTurn: true } } },
  { id: "fires-burn", label: "Fire's Burn", identifier: "fires-burn", trigger: ANY,
    activities: [{ id: "002cv19dj8WGzSl2", name: "Burn" }] },
  { id: "frosts-chill", label: "Frost's Chill", identifier: "frosts-chill", trigger: ANY,
    activities: [{ id: "6goWQaWLexUqgig8", name: "Chill" }] }
];

const presetsByIdentifier = new Map();
for ( const preset of PRESETS ) {
  if ( !presetsByIdentifier.has(preset.identifier) ) presetsByIdentifier.set(preset.identifier, []);
  presetsByIdentifier.get(preset.identifier).push(preset);
}

// Grab the raw activities, whether we have an item document or plain data.
export function activitySources(item) {
  return item._source?.system?.activities ?? item.system?.activities ?? {};
}

// Check if Use on Hit was set on the activity itself.
export function sourceTrigger(source) {
  return source?.flags?.[MODULE_ID]?.[FLAG] ?? "";
}

// Try activity ID first, then name. If there's only one damage activity,
// a single-activity preset can fall back to that.
export function matchActivities(item, preset) {
  const sources = activitySources(item);
  const damage = Object.entries(sources).filter(([, a]) => a?.type === "damage");
  const matches = [];
  for ( const entry of preset.activities ) {
    let found = damage.find(([id]) => id === entry.id);
    if ( !found && entry.name ) {
      found = damage.find(([, a]) => (a.name ?? "").toLowerCase() === entry.name.toLowerCase());
    }
    if ( !found && !preset.requireActivity && (preset.activities.length === 1) && (damage.length === 1) ) {
      found = damage[0];
    }
    if ( found && !matches.some(m => m.id === found[0]) ) matches.push({ preset, entry, id: found[0] });
  }
  return matches;
}

// Find a preset for this item, if we have one.
export function findPreset(item) {
  const system = item._source?.system ?? item.system ?? {};
  const candidates = presetsByIdentifier.get(system.identifier);
  if ( !candidates ) return null;
  const rules = system.source?.rules;
  if ( rules && (rules !== "2024") ) return { skip: `${rules} version` };
  for ( const preset of candidates ) {
    const matches = matchActivities(item, preset).filter(m => !m.entry.optional || m.id === m.entry.id);
    if ( matches.length ) return { preset, matches };
  }
  return { skip: "No matching damage activity" };
}

// Get the default trigger for an activity, or an empty string if it doesn't match.
export function presetTrigger(activity) {
  const found = activity?.item ? findPreset(activity.item) : null;
  if ( !found?.preset ) return "";
  return found.matches.some(m => m.id === activity.id) ? found.preset.trigger : "";
}
