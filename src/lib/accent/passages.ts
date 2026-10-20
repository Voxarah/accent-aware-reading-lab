export type Passage = { id: string; title: string; targets: string; text: string };

export const PASSAGES: Passage[] = [
  {
    id: "clusters",
    title: "The Last Test",
    targets: "Final consonant clusters",
    text: "Mike walked past the old desk and asked for the last test. He found it next to a cold hand lamp.",
  },
  {
    id: "th",
    title: "Three Brothers",
    targets: "th at the start, middle, and end",
    text: "The three brothers think that their mother went north with them. This is the path they both take.",
  },
  {
    id: "pin-pen",
    title: "Ten Pens",
    targets: "pin and pen",
    text: "Ben sent ten pens to his friend Jenny. She kept them in a tin when it was time to spend them.",
  },
  {
    id: "r-vowel",
    title: "The Farm Car",
    targets: "r after vowels",
    text: "My sister parked the car near the barn door. Four more horses were there for her before dark.",
  },
  {
    id: "mixed",
    title: "Running Home",
    targets: "All four sounds together",
    text: "I was running fast with my brother. We left ten bikes near the store and then went straight home.",
  },
];
