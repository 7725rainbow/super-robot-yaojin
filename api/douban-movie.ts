import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import cheerio from 'cheerio';

interface Movie {
  title: string;
  url: string;
  score: string;
  pic: string;
}

const DOUBAN_URL = 'https://movie.douban.com/chart';

export default async function (request: VercelRequest, response: VercelResponse) {
  try {
    const { data } = await axios.get(DOUBAN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);
    const movies: Movie[] = [];

    $('#content > div > div.article > div > div > table').each((i, element) => {
      const title = $(element).find('div.pl2 > a').text().trim().split('/')[0].trim();
      const url = $(element).find('div.pl2 > a').attr('href') || '';
      const score = $(element).find('.rating_nums').text().trim();
      const pic = $(element).find('.pl2 > a > img').attr('src') || '';

      if (title && url) {
        movies.push({
          title,
          url,
          score,
          pic,
        });
      }
    });

    response.status(200).json(movies);

  } catch (error) {
    console.error('Error fetching or parsing Douban data:', error);
    response.status(500).json({ error: 'Failed to fetch Douban movie data.' });
  }
}
