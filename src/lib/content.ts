export interface TopicContent {
  title: string;
  paragraphs: string[];
}

export const PRESET_TOPICS: Record<string, TopicContent> = {
  Photosynthesis: {
    title: "Photosynthesis",
    paragraphs: [
      "Photosynthesis is the process plants use to turn sunlight into food. Tiny parts of the leaf called chloroplasts capture light from the sun.",
      "Plants pull water up through their roots and breathe in carbon dioxide from the air. Inside the leaf, light energy splits the water and joins it with carbon dioxide.",
      "The result is glucose, a sugar the plant uses for energy, and oxygen, which the plant releases back into the air for us to breathe.",
      "Without photosynthesis, almost every food chain on Earth would collapse. It is the quiet engine that powers life on our planet.",
    ],
  },
  "Mitosis": {
    title: "Mitosis",
    paragraphs: [
      "Mitosis is how a single cell divides into two identical cells. It lets your body grow, heal cuts, and replace worn-out cells every day.",
      "Before dividing, the cell copies all of its DNA. Then the copies line up neatly in the middle of the cell.",
      "Tiny fibres pull the matching copies apart toward opposite ends. The cell pinches in the middle and splits into two new cells, each with the same instructions.",
    ],
  },
  "French Revolution": {
    title: "The French Revolution",
    paragraphs: [
      "In the late 1700s, France was deeply unequal. A small group of nobles and clergy paid no taxes, while ordinary people struggled to afford bread.",
      "In 1789, the people stormed the Bastille, a royal prison that stood as a symbol of the king's power. This day became the start of the revolution.",
      "Over the next decade, France swung between hope and chaos. The monarchy fell, new ideas about freedom and equality spread, and a young general named Napoleon began to rise.",
    ],
  },
};

export const ASSESSMENT_PARAGRAPH =
  "The library on the corner of Maple Street had stood for nearly a century. Inside, sunlight slipped through the tall windows and fell across rows of quiet books. Children whispered between the shelves, finding worlds far larger than the small town outside.";

export const DECODING_TRIALS: { word: string; kind: "nonword" | "irregular" }[] = [
  { word: "blap", kind: "nonword" },
  { word: "yacht", kind: "irregular" },
  { word: "strom", kind: "nonword" },
  { word: "island", kind: "irregular" },
  { word: "frindle", kind: "nonword" },
  { word: "colonel", kind: "irregular" },
];
