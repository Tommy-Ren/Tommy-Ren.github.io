const titles = ['Beach Resort', 'Just Relax', 'Road Trip', 'Disassociate', 'Foggy Window', 'Quiet Night', 'Getting a Haircut', 'The Golden Ratio', 'Riding My Bike to the End of the World', 'Look On The Bright Side'];
const covers = ['coast', 'forest', 'mountain', 'city', 'forest', 'coast', 'city', 'mountain', 'coast', 'forest'];
export const tracks = titles.map((title, index) => ({
  title, artist: 'Purrple Cat',
  src: `/blog/audio/${title.toLowerCase().replaceAll(' ', '-')}.mp3`,
  cover: `/blog/assets/${covers[index]}.webp`,
}));
