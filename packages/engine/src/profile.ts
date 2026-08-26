export type Character = {
  faceId: string;
  outfitId: string;
  instrumentSkinId: string;
};

export type ProfileStats = {
  songsPlayed: number;
  bestAccuracy: number;
  longestStreak: number;
  totalPoints: number;
};

export type Profile = {
  id: string;
  displayName: string;
  character: Character;
  stats: ProfileStats;
};
