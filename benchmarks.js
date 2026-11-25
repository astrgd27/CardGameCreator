// Initial acceptance scenarios. Entries stay pending until the complete scenario works.
export const benchmarks = [
  [
    "Pokémon TCG",
    "Set up an Active, Bench, and six hidden Prizes; win by taking the final Prize.",
    "Build a reusable Pokémon frame with two attacks, separate Energy symbols, damage, and weakness.",
    "Evolve an eligible Benched creature while retaining its attached Energy and damage.",
  ],
  [
    "Magic: The Gathering",
    "Pass priority twice and resolve the top object of a three-object stack.",
    "Create a double-faced card with independently bound fields and a transformable play view.",
    "Apply a replacement effect to a draw event and handle a competing replacement.",
  ],
  [
    "Yu-Gi-Oh!",
    "Build and resolve a legal Chain with Spell Speed restrictions.",
    "Build a Link-style frame with independently selectable directional arrows.",
    "Use an Extra Deck summon procedure that checks materials and legal destination zones.",
  ],
  [
    "One Piece",
    "Resolve an attack through blocker, counter, damage and optional Life Trigger.",
    "Make a reusable Leader frame with distinct Life, power, color, and attribute fields.",
    "Assign a DON!! resource to a unit and apply its turn-restricted modifier.",
  ],
  [
    "Riftbound",
    "Contest a battlefield, resolve a showdown, then score for control.",
    "Create separate reusable layouts for a battlefield and a rune in one module.",
    "Pay a cost using both exhausted and recycled resources from a separate rune deck.",
  ],
];
