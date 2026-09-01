export const ACHIEVEMENTS: { id: string; name: string; desc: string }[] = [
  { id: "first-blood", name: "First Dust", desc: "Win your first match." },
  { id: "disarmer", name: "Empty Hands", desc: "Disarm an opponent." },
  { id: "combo-5", name: "Rhythm of Iron", desc: "Land a 5-hit combo." },
  { id: "champion", name: "Arena Laurel", desc: "Win a tournament." },
  { id: "survivor", name: "Unbroken", desc: "Reach survival wave 8." },
  { id: "campaign", name: "From Sand to Marble", desc: "Finish the campaign." },
  { id: "thrower", name: "Flying Steel", desc: "Win a round with a thrown weapon." },
  { id: "perfect", name: "Untouched", desc: "Win a match without taking damage." },
];

export const CHALLENGES: { id: string; name: string; target: number; reward: number }[] = [
  { id: "wins-10", name: "Ten Crowns", target: 10, reward: 150 },
  { id: "kos-25", name: "Crowd Favorite", target: 25, reward: 200 },
  { id: "throws-15", name: "Javelin Heart", target: 15, reward: 120 },
  { id: "parries-20", name: "Wall of Bronze", target: 20, reward: 180 },
];
