export const TEMPLATE_IMG = "icons/skills/ranged/arrow-flying-spiral-blue.webp";

export const MASTERY_TEMPLATES = {
  "topple": {
    "activity": {
      "_id": "sO7B4f0FtBempAUN",
      "type": "save",
      "name": "Topple",
      "sort": 0,
      "activation": {
        "type": "",
        "condition": "When you hit a creature with a weapon whose mastery you can use",
        "override": false
      },
      "range": {
        "units": "spec",
        "special": "The creature you hit",
        "override": false
      },
      "target": {
        "affects": {
          "type": "creature",
          "count": "1",
          "choice": false,
          "special": ""
        },
        "prompt": false,
        "override": false,
        "template": {
          "contiguous": false,
          "stationary": false,
          "units": "ft",
          "type": ""
        }
      },
      "duration": {
        "units": "inst",
        "override": false,
        "expiry": null,
        "concentration": false
      },
      "flags": {
        "on-hit-features-5e": {
          "mastery": "topple"
        }
      },
      "description": {
        "value": "<p>The target makes a Constitution saving throw or has the Prone condition.</p>",
        "chatFlavor": ""
      },
      "save": {
        "ability": [
          "con"
        ],
        "dc": {
          "calculation": "",
          "formula": "8 + max(@abilities.dex.mod, @abilities.str.mod) + @prof"
        },
        "visible": true,
        "bonus": ""
      },
      "damage": {
        "parts": [],
        "onSave": "none"
      },
      "effects": [
        {
          "_id": "OLzcdzbHh0otpsHq",
          "uuid": null,
          "onSave": false,
          "level": {
            "min": null,
            "max": null
          }
        }
      ],
      "img": "icons/svg/combat.svg",
      "behaviors": [],
      "consumption": {
        "scaling": {
          "allowed": false
        },
        "spellSlot": true,
        "targets": []
      },
      "uses": {
        "recovery": [],
        "max": "",
        "spent": 0
      },
      "visibility": {
        "level": {
          "min": null,
          "max": null
        },
        "requireAttunement": false,
        "requireIdentification": false,
        "requireMagic": false,
        "identifier": ""
      }
    },
    "effects": [
      {
        "_id": "OLzcdzbHh0otpsHq",
        "name": "Prone",
        "img": "systems/dnd5e/icons/svg/statuses/prone.svg",
        "transfer": false,
        "statuses": [
          "prone"
        ],
        "flags": {
          "on-hit-features-5e": {
            "mastery": "topple"
          }
        },
        "type": "base",
        "system": {
          "changes": [],
          "origin": {},
          "conditions": "{}",
          "magical": false,
          "rider": {
            "statuses": [
              "prone"
            ]
          }
        },
        "disabled": false,
        "start": null,
        "duration": {
          "value": null,
          "units": "seconds",
          "expiry": null,
          "expired": false
        },
        "description": "",
        "tint": "#ffffff",
        "showIcon": 1,
        "sort": 0
      }
    ]
  },
  "push": {
    "activity": {
      "_id": "kIkwKcmLr9Un3Jzq",
      "type": "utility",
      "name": "Push",
      "sort": 10,
      "activation": {
        "type": "",
        "condition": "When you hit a creature with a weapon whose mastery you can use",
        "override": false
      },
      "range": {
        "units": "spec",
        "special": "The creature you hit",
        "override": false
      },
      "target": {
        "affects": {
          "type": "creature",
          "count": "1",
          "choice": false,
          "special": ""
        },
        "prompt": false,
        "override": false,
        "template": {
          "contiguous": false,
          "stationary": false,
          "units": "ft",
          "type": ""
        }
      },
      "duration": {
        "units": "inst",
        "override": false,
        "expiry": null,
        "concentration": false
      },
      "flags": {
        "on-hit-features-5e": {
          "mastery": "push"
        }
      },
      "description": {
        "value": "<p>If the target is Large or smaller, you can push it up to 10 feet straight away from yourself.</p>",
        "chatFlavor": ""
      },
      "img": "icons/svg/combat.svg",
      "behaviors": [],
      "consumption": {
        "scaling": {
          "allowed": false
        },
        "spellSlot": true,
        "targets": []
      },
      "effects": [],
      "uses": {
        "recovery": [],
        "max": "",
        "spent": 0
      },
      "visibility": {
        "level": {
          "min": null,
          "max": null
        },
        "requireAttunement": false,
        "requireIdentification": false,
        "requireMagic": false,
        "identifier": ""
      },
      "roll": {
        "prompt": false,
        "visible": false,
        "formula": "",
        "name": ""
      }
    },
    "effects": []
  },
  "sap": {
    "activity": {
      "_id": "wtL9PCnX1gS8fKOM",
      "type": "utility",
      "name": "Sap",
      "sort": 20,
      "activation": {
        "type": "",
        "condition": "When you hit a creature with a weapon whose mastery you can use",
        "override": false
      },
      "range": {
        "units": "spec",
        "special": "The creature you hit",
        "override": false
      },
      "target": {
        "affects": {
          "type": "creature",
          "count": "1",
          "choice": false,
          "special": ""
        },
        "prompt": false,
        "override": false,
        "template": {
          "contiguous": false,
          "stationary": false,
          "units": "ft",
          "type": ""
        }
      },
      "duration": {
        "units": "inst",
        "override": false,
        "expiry": null,
        "concentration": false
      },
      "flags": {
        "on-hit-features-5e": {
          "mastery": "sap"
        }
      },
      "description": {
        "value": "<p>The target has Disadvantage on its next attack roll before the start of your next turn.</p>",
        "chatFlavor": ""
      },
      "effects": [
        {
          "_id": "xKjoTMcJ55wp1320",
          "uuid": null,
          "level": {
            "min": null,
            "max": null
          }
        }
      ],
      "img": "icons/svg/combat.svg",
      "behaviors": [],
      "consumption": {
        "scaling": {
          "allowed": false
        },
        "spellSlot": true,
        "targets": []
      },
      "uses": {
        "recovery": [],
        "max": "",
        "spent": 0
      },
      "visibility": {
        "level": {
          "min": null,
          "max": null
        },
        "requireAttunement": false,
        "requireIdentification": false,
        "requireMagic": false,
        "identifier": ""
      },
      "roll": {
        "prompt": false,
        "visible": false,
        "formula": "",
        "name": ""
      }
    },
    "effects": [
      {
        "_id": "xKjoTMcJ55wp1320",
        "name": "Sapped",
        "img": "icons/svg/downgrade.svg",
        "transfer": false,
        "description": "<p>Disadvantage on the next attack roll before the start of the attacker's next turn.</p>",
        "duration": {
          "value": null,
          "units": "seconds",
          "expiry": "sourceStart",
          "expired": false
        },
        "flags": {
          "on-hit-features-5e": {
            "mastery": "sap"
          }
        },
        "system": {
          "changes": [],
          "origin": {},
          "conditions": "{}",
          "magical": false,
          "rider": {
            "statuses": []
          }
        },
        "type": "base",
        "disabled": false,
        "start": null,
        "tint": "#ffffff",
        "statuses": [],
        "showIcon": 1,
        "sort": 0
      }
    ]
  },
  "slow": {
    "activity": {
      "_id": "XPzQwtlSHwTWkPYD",
      "type": "utility",
      "name": "Slow",
      "sort": 30,
      "activation": {
        "type": "",
        "condition": "When you hit a creature with a weapon whose mastery you can use",
        "override": false
      },
      "range": {
        "units": "spec",
        "special": "The creature you hit",
        "override": false
      },
      "target": {
        "affects": {
          "type": "creature",
          "count": "1",
          "choice": false,
          "special": ""
        },
        "prompt": false,
        "override": false,
        "template": {
          "contiguous": false,
          "stationary": false,
          "units": "ft",
          "type": ""
        }
      },
      "duration": {
        "units": "inst",
        "override": false,
        "expiry": null,
        "concentration": false
      },
      "flags": {
        "on-hit-features-5e": {
          "mastery": "slow"
        }
      },
      "description": {
        "value": "<p>The target's Speed is reduced by 10 feet until the start of your next turn. Multiple Slow reductions don't stack.</p>",
        "chatFlavor": ""
      },
      "effects": [
        {
          "_id": "raD8TDnP4Y13Qbb4",
          "uuid": null,
          "level": {
            "min": null,
            "max": null
          }
        }
      ],
      "img": "icons/svg/combat.svg",
      "behaviors": [],
      "consumption": {
        "scaling": {
          "allowed": false
        },
        "spellSlot": true,
        "targets": []
      },
      "uses": {
        "recovery": [],
        "max": "",
        "spent": 0
      },
      "visibility": {
        "level": {
          "min": null,
          "max": null
        },
        "requireAttunement": false,
        "requireIdentification": false,
        "requireMagic": false,
        "identifier": ""
      },
      "roll": {
        "prompt": false,
        "visible": false,
        "formula": "",
        "name": ""
      }
    },
    "effects": [
      {
        "_id": "raD8TDnP4Y13Qbb4",
        "name": "Slowed (Mastery)",
        "img": "icons/svg/clockwork.svg",
        "transfer": false,
        "description": "<p>Speed reduced by 10 feet until the start of the attacker's next turn.</p>",
        "duration": {
          "value": null,
          "units": "seconds",
          "expiry": "sourceStart",
          "expired": false
        },
        "flags": {
          "on-hit-features-5e": {
            "mastery": "slow"
          }
        },
        "system": {
          "changes": [
            {
              "key": "system.attributes.movement.bonus",
              "value": -10,
              "type": "add",
              "phase": "initial",
              "_id": "FAbmew5Z5rkmTLjs",
              "conditions": "{}",
              "replacement": ""
            }
          ],
          "origin": {},
          "conditions": "{}",
          "magical": false,
          "rider": {
            "statuses": []
          }
        },
        "type": "base",
        "disabled": false,
        "start": null,
        "tint": "#ffffff",
        "statuses": [],
        "showIcon": 1,
        "sort": 0
      }
    ]
  },
  "vex": {
    "activity": {
      "_id": "ZY9ZkhmKcAe1RLnx",
      "type": "utility",
      "name": "Vex",
      "sort": 40,
      "activation": {
        "type": "",
        "condition": "When you hit a creature with a weapon whose mastery you can use",
        "override": false
      },
      "range": {
        "units": "self",
        "override": false,
        "special": ""
      },
      "target": {
        "affects": {
          "type": "self",
          "choice": false,
          "special": ""
        },
        "prompt": false,
        "override": false,
        "template": {
          "contiguous": false,
          "stationary": false,
          "units": "ft",
          "type": ""
        }
      },
      "duration": {
        "units": "inst",
        "override": false,
        "expiry": null,
        "concentration": false
      },
      "flags": {
        "on-hit-features-5e": {
          "mastery": "vex"
        }
      },
      "description": {
        "value": "<p>You have Advantage on your next attack roll against the target before the end of your next turn.</p>",
        "chatFlavor": ""
      },
      "effects": [
        {
          "_id": "LFBip8G2IpU9OlFI",
          "uuid": null,
          "level": {
            "min": null,
            "max": null
          }
        }
      ],
      "img": "icons/svg/combat.svg",
      "behaviors": [],
      "consumption": {
        "scaling": {
          "allowed": false
        },
        "spellSlot": true,
        "targets": []
      },
      "uses": {
        "recovery": [],
        "max": "",
        "spent": 0
      },
      "visibility": {
        "level": {
          "min": null,
          "max": null
        },
        "requireAttunement": false,
        "requireIdentification": false,
        "requireMagic": false,
        "identifier": ""
      },
      "roll": {
        "prompt": false,
        "visible": false,
        "formula": "",
        "name": ""
      }
    },
    "effects": [
      {
        "_id": "LFBip8G2IpU9OlFI",
        "name": "Vexing",
        "img": "icons/svg/target.svg",
        "transfer": false,
        "description": "<p>Advantage on your next attack roll against the target before the end of your next turn.</p>",
        "duration": {
          "value": null,
          "units": "seconds",
          "expiry": "sourceEnd",
          "expired": false
        },
        "flags": {
          "on-hit-features-5e": {
            "mastery": "vex"
          }
        },
        "system": {
          "changes": [],
          "origin": {},
          "conditions": "{}",
          "magical": false,
          "rider": {
            "statuses": []
          }
        },
        "type": "base",
        "disabled": false,
        "start": null,
        "tint": "#ffffff",
        "statuses": [],
        "showIcon": 1,
        "sort": 0
      }
    ]
  }
};
