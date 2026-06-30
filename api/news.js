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
  { id:'bbc_sport', name:'BBC Sport', url:'http://feeds.bbci.co.uk/sport/rss.xml', homepage:'https://www.bbc.com/sport', category:'Sports', color:'#fcb813' },
  { id:'sky_sport', name:'Sky Sports', url:'https://www.skysports.com/rss/12040', homepage:'https://www.skysports.com', category:'Sports', color:'#0057a0' },
  { id:'yahoo_sport', name:'Yahoo Sports', url:'https://sports.yahoo.com/rss/', homepage:'https://sports.yahoo.com', category:'Sports', color:'#6001d2' },
  { id:'bleacher', name:'Bleacher Report', url:'https://bleacherreport.com/articles/feed', homepage:'https://bleacherreport.com', category:'Sports', color:'#ff0000' },
  { id:'nature', name:'Nature', url:'https://www.nature.com/nature.rss', homepage:'https://www.nature.com', category:'Science', color:'#1077c6' },
  { id:'economist', name:'The Economist', url:'https://www.economist.com/finance-and-economics/rss.xml', homepage:'https://www.economist.com', category:'Business', color:'#e3120b' },
  { id:'cnbc', name:'CNBC', url:'https://www.cnbc.com/id/100003114/device/rss/rss.html', homepage:'https://www.cnbc.com', category:'Business', color:'#005594' },
];

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
  const match = xml.match(re);
  if (match) {
    return (match[1] !== undefined ? match[1] : match[2]).trim();
  }
  return '';
}

async function fetchFeed(source) {
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    
    const items = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
    
    return items.slice(0, 25).map(itemXml => {
      const title = extractTag(itemXml, 'title');
      
      let link = extractTag(itemXml, 'link');
      if (!link) {
        const linkMatch = itemXml.match(/<link[^>]*href="([^"]+)"/i);
        if (linkMatch) link = linkMatch[1];
      }
      
      const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published') || extractTag(itemXml, 'updated');
      const descRaw = extractTag(itemXml, 'description') || extractTag(itemXml, 'summary') || extractTag(itemXml, 'content');
      
      let image = '';
      const encMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"/i);
      if (encMatch) image = encMatch[1];
      
      if (!image) {
        const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"/i);
        if (mediaMatch) image = mediaMatch[1];
      }
      
      if (!image) {
        const thumbMatch = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
        if (thumbMatch) image = thumbMatch[1];
      }
      
      if (!image) {
        const imgMatch = descRaw.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch) image = imgMatch[1];
      }
      
      const description = descRaw.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').slice(0, 300);
      
      return {
        id: link,
        title,
        description,
        link,
        pubDate,
        image,
        source
      };
    }).filter(a => a.title && a.link);
  } catch (e) {
    console.error(`Failed to fetch ${source.name}:`, e.message);
    return [];
  }
}

export default async function handler(req, res) {
  const requestedSources = req.query.sources;
  let activeSources = SOURCES;

  if (requestedSources) {
    const ids = requestedSources.split(',');
    activeSources = SOURCES.filter(s => ids.includes(s.id));
  }

  const promises = activeSources.map(source => fetchFeed(source));
  const results = await Promise.all(promises);
  
  const articles = [];
  let successCount = 0;

  results.forEach(items => {
    if (items.length > 0) {
      successCount++;
      articles.push(...items);
    }
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ articles, successCount });
}
