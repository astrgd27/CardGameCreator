export const catalogVersion = "0.2";
export const benchmarkScope = "Initial two-player constructed-game scenarios. Historical mechanics and alternate formats remain to be cataloged. Each scenario requires authoring, play and ZIP round-trip evidence.";
export const benchmarks = [
  [
    "Pokémon TCG",
    [
      "rules",
      "Active and Bench capacity",
      "Create zones with capacities one and five.",
      "A second Active and sixth Benched unit are rejected before payment."
    ],
    [
      "rules",
      "Prize setup and victory",
      "Deal six hidden Prizes and award them after knockouts.",
      "Correct Prize awards occur and taking the last Prize wins."
    ],
    [
      "rules",
      "Turn action limits",
      "Configure attachment, evolution and attack windows.",
      "Attachment and evolution limits are enforced; attacking ends the turn."
    ],
    [
      "rules",
      "Opening procedure",
      "Require eligible opening creatures and mulligan compensation.",
      "Invalid openings repeat setup and award the specified compensation."
    ],
    [
      "design",
      "Multiple attacks",
      "Bind two attacks with separate cost and damage fields.",
      "Each attack displays its own data in editing, inspection and play."
    ],
    [
      "design",
      "Typed Energy symbols",
      "Bind mixed and generic resource symbols.",
      "Symbols follow each attack's payment data after edits."
    ],
    [
      "design",
      "Creature identity",
      "Bind stage, predecessor, type, weakness, resistance and retreat.",
      "Values differ per card and long text remains readable."
    ],
    [
      "design",
      "Trainer layouts",
      "Create distinct frames for persistent and immediate Trainers.",
      "Frame edits affect only their assigned category."
    ],
    [
      "logic",
      "Evolution inheritance",
      "Evolve a damaged creature with attachments.",
      "Damage and resources persist while applicable conditions change."
    ],
    [
      "logic",
      "Retreat payment",
      "Pay retreat with selected attached resources.",
      "Only legal resources pay and Active/Bench exchange succeeds."
    ],
    [
      "logic",
      "Special conditions",
      "Apply conditions with turn checks and switching behavior.",
      "Checks occur at the specified time and switching clears applicable conditions."
    ],
    [
      "logic",
      "Variable Prize awards",
      "Knock out creatures with different Prize values.",
      "Awards are correct and capped by remaining Prizes."
    ]
  ],
  [
    "Magic: The Gathering",
    [
      "rules",
      "Priority and stack",
      "Put three objects on a stack through alternating responses.",
      "Two passes resolve the top object and restore priority with remaining objects pending."
    ],
    [
      "rules",
      "Turn phases",
      "Configure beginning, main, combat, second main and ending procedures.",
      "Each action is accepted only in its legal window."
    ],
    [
      "rules",
      "Attackers and blockers",
      "Declare multiple attackers, blockers and damage assignments.",
      "Blocks and damage obey the configured combat rules."
    ],
    [
      "rules",
      "Deck and format constraints",
      "Configure size, copy exceptions and a sideboard.",
      "Violations are identified and the selected deck is used in play."
    ],
    [
      "design",
      "Double-faced cards",
      "Bind independent front and reverse faces.",
      "Inspection shows both and transformation changes the play face."
    ],
    [
      "design",
      "Mana notation",
      "Render colored, generic, variable and hybrid symbols.",
      "Each symbol matches its payment definition."
    ],
    [
      "design",
      "Rules and characteristics",
      "Bind title, type, art, rules, flavor and statistics.",
      "Fields wrap without overlap at desktop and tablet sizes."
    ],
    [
      "design",
      "Alternative frame families",
      "Create creature and loyalty frames.",
      "Each family shows its own relevant characteristics."
    ],
    [
      "logic",
      "Replacement choice",
      "Apply competing replacements to a draw.",
      "The affected player chooses a legal replacement and the event changes correctly."
    ],
    [
      "logic",
      "Continuous modifiers",
      "Combine base-setting, modifiers and counters.",
      "Final values update correctly as effects enter and expire."
    ],
    [
      "logic",
      "Triggered ordering",
      "Generate simultaneous triggers for both players.",
      "Players order triggers and the engine places them in the required order."
    ],
    [
      "logic",
      "Target recheck",
      "Make one target illegal before resolution.",
      "Partial and total target illegality are handled correctly."
    ]
  ],
  [
    "Yu-Gi-Oh!",
    [
      "rules",
      "Chain procedure",
      "Build responses with different timing restrictions.",
      "Only legal links are added and links resolve in reverse order."
    ],
    [
      "rules",
      "Summon destinations",
      "Define Main, Extra and linked monster destinations.",
      "Summons use eligible available zones."
    ],
    [
      "rules",
      "Battle positions",
      "Switch positions and attack.",
      "Positions determine attack eligibility and damage."
    ],
    [
      "rules",
      "Extra Deck setup",
      "Build main and Extra decks and an opening hand.",
      "The Extra Deck stays separate and obeys access restrictions."
    ],
    [
      "design",
      "Link arrows",
      "Bind eight independent directional arrows.",
      "Arrows reflect connection data on each card."
    ],
    [
      "design",
      "Pendulum panels",
      "Create separate monster and Pendulum panels.",
      "Both panels and scales remain independently bound."
    ],
    [
      "design",
      "Monster characteristics",
      "Bind level or rank, attribute, type, attack and defense.",
      "Only applicable characteristic sets appear."
    ],
    [
      "design",
      "Spell and Trap variants",
      "Create category frames and subtype icons.",
      "Icons and frames follow data changes."
    ],
    [
      "logic",
      "Material selection",
      "Select summon materials under multiple constraints.",
      "Only legal selections pay, with atomic movement."
    ],
    [
      "logic",
      "Optional timing",
      "Trigger optionally from the latest event.",
      "The choice appears only when its timing condition holds."
    ],
    [
      "logic",
      "Negation",
      "Negate activation and negate an effect in separate fixtures.",
      "Each produces its own correct cost, movement and trigger result."
    ],
    [
      "logic",
      "Attached materials",
      "Attach materials and detach them as a cost.",
      "Materials are retained and accessible only through legal operations."
    ]
  ],
  [
    "One Piece",
    [
      "rules",
      "Attack sequence",
      "Attack with blocker, counter and Life Trigger options.",
      "Windows occur in order with choices offered to the appropriate player."
    ],
    [
      "rules",
      "Resource setup and refresh",
      "Configure a separate DON resource deck.",
      "Acquisition and refreshing occur at their configured steps."
    ],
    [
      "rules",
      "Leader restrictions",
      "Set Leader color and starting-Life requirements.",
      "Deck legality and setup reflect the selected Leader."
    ],
    [
      "rules",
      "Rested targets",
      "Attack characters in different rest states.",
      "Only eligible targets and configured exceptions are permitted."
    ],
    [
      "design",
      "Leader frame",
      "Bind Life, power, colors and attributes.",
      "Each field is independent and readable in play."
    ],
    [
      "design",
      "Counter field",
      "Bind Counter separately from cost and power.",
      "Counter appears in browsing and response selection."
    ],
    [
      "design",
      "Trigger text",
      "Add a distinct Life Trigger rules area.",
      "Normal and Trigger text stay independently bound."
    ],
    [
      "design",
      "Multiple color identity",
      "Display multiple color identities.",
      "Symbols and accents reflect the combination."
    ],
    [
      "logic",
      "DON assignment",
      "Assign a resource with a turn-restricted benefit.",
      "Assignment persists and its modifier respects its time window."
    ],
    [
      "logic",
      "Life Trigger choice",
      "Take damage and choose whether to trigger the Life card.",
      "Accept and decline produce their correct destinations."
    ],
    [
      "logic",
      "Return-resource payment",
      "Pay by returning eligible resources.",
      "Legal resources pay and incomplete payments roll back."
    ],
    [
      "logic",
      "Duration-specific power",
      "Combine battle-long and turn-long benefits.",
      "Each modifier expires at its own endpoint."
    ]
  ],
  [
    "Riftbound",
    [
      "rules",
      "Battlefield control",
      "Contest a location with opposing units.",
      "Control updates after conflict resolution."
    ],
    [
      "rules",
      "Scoring windows",
      "Configure conquest and holding scores.",
      "Points accrue at the intended windows and victory is checked."
    ],
    [
      "rules",
      "Showdown responses",
      "Contest a location with responses available.",
      "Priority and resolution follow the showdown procedure."
    ],
    [
      "rules",
      "Starting components",
      "Configure Legend, champion access, battlefields and Rune deck.",
      "Each component starts in its intended location and visibility."
    ],
    [
      "design",
      "Battlefield frame",
      "Create a landscape location frame.",
      "Name, art and rules remain readable on table and in inspection."
    ],
    [
      "design",
      "Rune frame",
      "Create a distinct resource layout.",
      "Each type uses its assigned frame and bound data."
    ],
    [
      "design",
      "Domain notation",
      "Bind domain symbols and separate cost components.",
      "Symbols and costs update from card data."
    ],
    [
      "design",
      "Identity layouts",
      "Create distinct Legend and champion frames.",
      "Each displays its own traits and links."
    ],
    [
      "logic",
      "Exhaust and recycle payment",
      "Pay using both exhausted and recycled runes.",
      "Both resource costs complete in one legal transaction."
    ],
    [
      "logic",
      "Location movement",
      "Move units from a base into battlefields.",
      "Destinations are filtered and presence/control update."
    ],
    [
      "logic",
      "Hidden location cards",
      "Hide a card at a location and reveal it legally.",
      "Opponents cannot inspect before revelation; effects then resolve."
    ],
    [
      "logic",
      "Location-scoped effects",
      "Affect allied units at one location.",
      "Only eligible units there are affected, including after movement."
    ]
  ]
].flatMap(([game,...cases]) => cases.map(([category,title,setup,expected],i) => ({
  id: game.toLowerCase().replace(/[^a-z]/g,"")+"-"+String(i+1).padStart(2,"0"),
  game, category, title, setup, expected, status:"Pending",
  verification:"Author an original fixture using public controls. Exercise valid and invalid choices. Export and import the module and repeat. Record the least complex successful authoring layer."
})));
