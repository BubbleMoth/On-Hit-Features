# On-Hit Features

On-Hit Features adds a list of optional features to the D&D 5e damage roll dialog in Foundry. Pick what you want to use, then roll damage as usual. Things like Sneak Attack and Divine Smite add damage to the roll; saves and other follow-up activities get their own chat cards afterward.

The module doesn't check whether an attack hit or whether a feature is allowed. That's still up to the player and GM.

## Installation

Requires **Foundry VTT v14** and **dnd5e 6.0.5+**. Install it from **Add-on Modules --> Install Module** using this manifest URL:

```
https://github.com/BubbleMoth/on-hit-features/releases/latest/download/module.json
```

Enable it in your world. Features covered by a preset should work without any extra setup.

## Presets

There are presets for 39 features from the **2024 SRD and Player's Handbook**, including Sneak Attack, Divine Smite (and other smites), Hex, Hunter's Mark, Battle Master maneuvers, and more.

Presets match feature identifiers, so they should still work if an item has been renamed or imported.

NOTE: **2014 features aren't supported by the presets.**

To override a preset for a specific activity, change **Use on Hit** on its activity sheet. **Default** follows the preset, and **Off** disables it for that copy.

## Setting up your own features

1. Open the features activity (for example, Sneak Attack's **Damage** activity).
2. Under **Activation -->  Time --> On Hit -->  Use on Hit**, choose when it should appear:
   - **Any attack** - weapon, unarmed, or spell attacks.
   - **Weapon attacks only**.
   - **Weapon or unarmed attacks** - includes Unarmed Strikes, but not spell attacks.
   - **Default** - use the preset if there is one; otherwise off.
   - **Off** - never show it.
3. For limited-use features, add an **Activity Uses** consumption target and set up recovery normally.

This doesn't replace the features usual activation. For example, Divine Smite remains a Bonus Action and can still be used from the sheet.

## Using the damage dialog

Eligible features show up under **On Hit**, with their damage or save, activation, and remaining uses. Damage gets added to the current roll. Anything under **After damage**, such as a mastery or saving throw, posts a separate chat card.

For spells that can be upcast, choose a slot level from the dropdown. If the spell has a free casting, that option is selected by default while it's available. Free castings use their own charge and cast at the spell's base level.

Costs are paid when you make the damage roll. If any selected feature can't be paid for, the roll stops before spending anything.

A **summary card** shows the weapon's damage, any mastery used, each added feature and what it spent, and the total. The numbers are the damage values before resistance or vulnerability.

## Weapon masteries

If your character has mastered the weapon, its on-hit mastery appears under **After damage**. It's selected by default because it's free. (Note: Cleave isnt selected by default because it requires a unique trigger. Graze just isnt supported by this module)

The module posts a normal activity card after damage, so saves and effects can be handled from the card. Some, like push are just reminders. Note, cleave does NOT enforce 

## Maneuvers and other follow-ups

By default, Battle Master maneuvers that have a separate save activity (such as Trip Attack or Menacing Attack) also post that save card after damage. The save doesn't spend the maneuver's resource a second time. Homebrew features marked as maneuvers work too.

The **Post a features other activities** setting can turn this off or enable it for every feature. **All features (experimental)** may produce extra cards you don't want, like Hunter's Mark's *Mark Creature* activity on every hit.

## Settings

Find these under **Configure Settings --> On-Hit Features**. They're world settings.

They're pretty self explanatory 

## Troubleshooting

As GM, you can also open the browser console (`F12`) and run this to see which features the module recognizes and why:

```js
game.modules.get("on-hit-features-5e").api.report()
```

## Known limitations

- **Fast-forwarded damage rolls** skip the dialog, so this function basically does nothing, 
- **Once-per-turn limits aren't tracked.** This module does NOT enforce once/turn effects. The original feature needs to track its uses.
- The module shows Bonus Action costs but doesn't track your action uses..
- Cleaves own rolls use the roll mode chosen in their dialogs, not necessarily the original attack's roll mode.
- Other modules that automate smites, Sneak Attack, or damage dialogs may conflict or cause duplicate damage.
- Midi-QOL and similar dialog replacements haven't been tested. Use at your own risk,

This module is made for **2024 rules content**. It was tested with Foundry v14 (build 368), dnd5e 6.0.5, and the official Player's Handbook module.
