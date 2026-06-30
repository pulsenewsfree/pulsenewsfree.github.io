const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

const SOURCES = [
  { id:'bbc', name:'BBC', url:'http://feeds.bbci.co.uk/news/world/rss.xml', homepage:'https://www.bbc.com/news', category:'World', color:'#bb1919' },
  { id:'guardian', name:'The Guardian', url:'https://www.theguardian.com/world/rss', homepage:'https://www.theguardian.com', category:'World', color:'#052962' },
  { id:'nyt', name:'NYT', url:'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', homepage:'https://www.nytimes.com', category:'World', color:'#5677fc' },
  { id:'aljazeera', name:'Al Jazeera', url:'https://www.aljazeera.com/xml/rss/all.xml', homepage:'https://www.aljazeera.com', category:'World', color:'#fa9200' },
  { id:'npr', name:'NPR', url:'https://feeds.npr.org/1001/rss.xml', homepage:'https://www.npr.org', category:'World', color:'#0066cc' },
  { id:'dw', name:'Deutsche Welle', url:'https://rss.dw.com/rdf/rss-en-all', homepage:'https://www.dw.com', category:'World', color:'#002d5e' },
  { id:'skynews', name:'Sky News', url:'https://feeds.skynews.com/feeds/rss/home.xml', homepage:'https://news.sky.com', category:'World', color:'#ff0030' },
  { id:'hindu', name:'The Hindu', url:'https://www.thehindu.com/news/national/feeder/default.rss', homepage:'https://www.thehindu.com', category:'World', color:'#dc2828' },
  { id:'techcrunch', name:'TechCrunch', url:'https://techcrunch.com/feed/', homepage:'https://techcrunch.com', category:'Tech', color:'#00c853' },
  { id:'verge', name:'The Verge', url:'https://www.theverge.com/rss/index.xml', homepage:'https://www.theverge.com', category:'Tech', color:'#e91e63' },
  { id:'wired', name:'WIRED', url:'https://www.wired.com/feed/rss', homepage:'https://www.wired.com', category:'Tech', color:'#a0a0a0' },
  { id:'ars', name:'Ars Technica', url:'https://feeds.arstechnica.com/arstechnica/index', homepage:'https://arstechnica.com', category:'Tech', color:'#ff4e00' },
  { id:'espn', name:'ESPN', url:'https://www.espn.com/espn/rss/news', homepage:'https://www.espn.com', category:'Sports', color:'#d50032' },
  { id:'nature', name:'Nature', url:'https://www.nature.com/nature.rss', homepage:'https://www.nature.com', category:'Science', color:'#1077c6' },
  { id:'economist', name:'The Economist', url:'https://www.economist.com/finance-and-economics/rss.xml', homepage:'https://www.economist.com', category:'Business', color:'#e3120b' },
  { id:'cnbc', name:'CNBC', url:'https://www.cnbc.com/id/100003114/device/rss/rss.html', homepage:'https://www.cnbc.com', category:'Business', color:'#005594' },
];

exports.handler = async (event, context) => {
  const requestedSources = event.queryStringParameters.sources;
  let activeSources = SOURCES;

  if (requestedSources) {
    const ids = requestedSources.split(',');
    activeSources = SOURCES.filter(s => ids.includes(s.id));
  }

  const promises = activeSources.map(async (source) => {
    try {
      const feed = await parser.parseURL(source.url);
      return feed.items.slice(0, 25).map(item => {
        let image = '';
        if (item.enclosure && item.enclosure.url) {
          image = item.enclosure.url;
        } else if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
          image = item['media:content'].$.url;
        } else if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
          image = item['media:thumbnail'].$.url;
        } else if (item.content) {
          const match = item.content.match(/<img[^>]+src="([^">]+)"/i);
          if (match) image = match[1];
        } else if (item['content:encoded']) {
          const match = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/i);
          if (match) image = match[1];
        }

        return {
          id: item.link || item.guid,
          title: item.title,
          description: (item.contentSnippet || item.summary || '').slice(0, 300),
          link: item.link,
          pubDate: item.isoDate || item.pubDate,
          image: image,
          source: source
        };
      });
    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error.message);
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  const articles = [];
  let successCount = 0;

  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      successCount++;
      articles.push(...r.value);
    }
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    },
    body: JSON.stringify({ articles, successCount })
  };
};
