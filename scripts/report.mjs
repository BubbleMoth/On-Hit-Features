// Console-only report of on-hit activities. Doesn't change any world data.

import { ANY, WEAPON, WEAPON_OR_UNARMED, OFF } from "./constants.mjs";
import { findPreset, presetTrigger, sourceTrigger } from "./presets.mjs";

const SETTING_LABELS = {
  [ANY]: "Any attack", [WEAPON]: "Weapon attacks only", [WEAPON_OR_UNARMED]: "Weapon or unarmed attacks",
  [OFF]: "Off", "": "Off"
};

// Scan world actors and items, plus unlinked scene tokens unless disabled.
export function scanWorld({ includeTokens=true }={}) {
  const owners = Array.from(game.actors).map(actor => ({ actor, token: null }));
  if ( includeTokens ) {
    for ( const scene of game.scenes ) {
      for ( const token of scene.tokens ) {
        if ( !token.actorLink && token.actor ) owners.push({ actor: token.actor, token });
      }
    }
  }
  owners.push({ actor: null, token: null, items: Array.from(game.items) });

  const rows = [];
  for ( const { actor, token, items } of owners ) {
    const owner = actor ? (token ? `${token.name} (token, ${token.parent?.name})` : actor.name) : "Items directory";
    for ( const item of items ?? actor.items ) {
      const base = { actor, item, owner, feature: item.name };
      const found = findPreset(item);
      if ( found?.skip ) rows.push({ ...base, activity: "", setting: "—", source: `Preset not used: ${found.skip}`,
        status: "skip" });

      for ( const activity of item.system.activities ?? [] ) {
        if ( activity.type === "attack" ) continue;
        const own = sourceTrigger(item._source.system.activities?.[activity.id]);
        const preset = presetTrigger(activity);
        if ( !own && !preset ) continue;
        let source;
        let status = "on";
        if ( own === OFF ) {
          source = preset ? "Off by hand (preset turned off)" : "Off by hand";
          status = "off";
        } else if ( own ) {
          source = "Set by hand";
        } else if ( preset ) source = "Preset";
        else continue;
        const setting = SETTING_LABELS[own === OFF ? OFF : (own || preset)];
        rows.push({ ...base, activity: activity.name || activity.constructor.metadata?.title || activity.type,
          setting, source, status });
      }
    }
  }
  return rows;
}

// Run game.modules.get("on-hit-features-5e").api.report() in the console.
export const API = {
  report({ includeTokens=true }={}) {
    const rows = scanWorld({ includeTokens });
    console.table(rows.map(r => ({
      Actor: r.owner, Feature: r.feature, Activity: r.activity, "Use on Hit": r.setting, Why: r.source
    })));
    return rows;
  }
};
