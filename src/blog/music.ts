import studyCatalog from './music-catalog.json';

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover: string;
  album?: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  duration?: number;
};

const titles = ['Beach Resort', 'Just Relax', 'Road Trip', 'Disassociate', 'Foggy Window', 'Quiet Night', 'Getting a Haircut', 'The Golden Ratio', 'Riding My Bike to the End of the World', 'Look On The Bright Side'];
const covers = ['coast', 'forest', 'mountain', 'city', 'forest', 'coast', 'city', 'mountain', 'coast', 'forest'];
const originalAlbum: MusicTrack[] = titles.map((title, index) => ({
  id: `just-relax-${index + 1}`,
  title, artist: 'Purrple Cat',
  src: `/blog/audio/${title.toLowerCase().replaceAll(' ', '-')}.mp3`,
  cover: `/blog/assets/${covers[index]}.webp`,
  album: 'Just Relax',
  sourceUrl: 'https://purrplecat.itch.io/just-relax',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
}));

export const tracks: MusicTrack[] = [...studyCatalog, ...originalAlbum];
