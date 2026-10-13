# Study radio

The player contains **110 complete recordings**. It does not use previews or synthetic repeated tracks to reach this count.

- `study/`: 100 calm lo-fi instrumental selections from 23 credited artists, downloaded from the [Free Stock Music lo-fi catalog](https://www.free-stock-music.com/lo-fi.html) on 2026-10-13. Their individual download listings license them under CC BY 3.0, CC BY 4.0, CC BY-SA 3.0, or CC BY-SA 4.0.
- The 10 original MP3 files are Purrple Cat's *Just Relax*, provided through [the artist's itch.io release](https://purrplecat.itch.io/just-relax) under CC BY-SA 4.0. They remain unmodified.
- [credits.txt](credits.txt) preserves the title, actual artist, attribution text, source link, license link, and local file for every selection. Those licenses apply to the music independently of the site's code license.

The additional recordings have only been re-encoded to **AAC, 96 kbps**, with `faststart` for prompt playback. No recording was shortened, remixed, or sped up. Each original and encoded duration was compared within 0.2 seconds. The files together add about 182 MiB; the browser loads only the selected song, not the whole library. No third-party audio hotlinks are required at playback time.

The catalog with durations, source URLs, attribution and audio hashes is maintained in `src/blog/music-catalog.json`. `src/blog/music.ts` adds the original album and the separate Spotify recommendations. The player uses existing blog photography as decorative thumbnails; these are not the artists' album covers. Photo attribution is maintained in `/blog/assets/sources.json`.

The official Spotify links include Sleepy Fish's *Velocities* and *for when it's warmer*, A L E X's *Golden Mercedes*, and the TRA$H artist page provided by Tommy. No verified official track link for TRA$H's *I don't blame you* was found during this update, so it has not been mislabeled as a locally playable recording. Spotify links are not included in the 110-song count.

To add a song, obtain a suitable redistribution license, put the complete recording in `public/blog/audio/`, add its player metadata, and retain attribution and license information in `credits.txt`. An ordinary Spotify URL is a listening link, not an audio file or a redistribution license.
