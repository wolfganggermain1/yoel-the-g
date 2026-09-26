export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import { getTubeGames, getTubeVideos } from '@/lib/db';
import TubeApp from '@/components/tube/TubeApp';

const THUMB_DIR = path.join(process.cwd(), 'public', 'tube', 'thumbs');

export default function TubePage() {
  const videos = getTubeVideos();
  const games = getTubeGames().map((g) => ({
    ...g,
    thumb: fs.existsSync(path.join(THUMB_DIR, `${g.slug}.jpg`)) ? `/tube/thumbs/${g.slug}.jpg` : null,
  }));

  return <TubeApp videos={videos} games={games} />;
}
