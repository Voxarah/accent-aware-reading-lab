// Sample readers per passage. Typed transcripts written for the demo;
// no child audio is involved. All use the AAE profile.
export type ReaderId = "dialect" | "miscue" | "mixed" | "control";

export const READERS: { id: ReaderId; label: string; blurb: string }[] = [
  { id: "dialect", label: "Dialect reader", blurb: "Reads every word, in AAE" },
  { id: "miscue", label: "Struggling reader", blurb: "Real decoding mistakes" },
  { id: "mixed", label: "Mixed reader", blurb: "Some AAE + one real mistake" },
  { id: "control", label: "Control", blurb: "Reads text exactly" },
];

export const PRESETS: Record<string, Record<Exclude<ReaderId, "control">, string>> = {
  clusters: {
    dialect: "Mike walk pas da ol des and aks for da las tes. He foun it nex to a col han lamp.",
    miscue: "Mike walked past the old duck and asked for the lost test. He found it next to a hand lamp.",
    mixed: "Mike walk pas da old desk and aks for the last toast. He found it next to a cold hand lamp.",
  },
  th: {
    dialect: "Da tree brovers tink dat their mover went norf wif dem. Dis is da paf dey bof take.",
    miscue: "The three brothers thank that their mother went west with them. This is the bath they take.",
    mixed: "Da three brothers tink dat their mother went north with them. This is the bath they both take.",
  },
  "pin-pen": {
    dialect: "Bin sint tin pins to his frien Jinny. She kep dem in a tin when it was time to spin dem.",
    miscue: "Ben sat ten pans to his friend Jenny. She kept them in a box when it was time to spend them.",
    mixed: "Bin sint tin pins to his friend Jenny. She kept them in a tin when it was time to sell them.",
  },
  "r-vowel": {
    dialect: "My sistah pahk da cah neah da bahn doh. Fo mo horses were dere fo huh befo dahk.",
    miscue: "My sister packed the car near the brown door. Four more houses were there for her before dark.",
    mixed: "My sistah pahk the car near the barn door. Four more horses were there for her before night.",
  },
  mixed: {
    dialect: "I was runnin fas wif my brover. We lef tin bikes neah da sto and den went straight home.",
    miscue: "I was running fast with my mother. We left two bikes near the stone and then went home.",
    mixed: "I was runnin fas wif my brover. We left ten bikes near the store and then went straight house.",
  },
};
