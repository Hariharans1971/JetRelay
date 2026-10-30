"""Create immutable public-data shards. The backend fetches one search shard, not 86k records."""
import json,re,unicodedata,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows=json.load(open(root/'lib/data/airports.json'));runways=json.load(open(root/'lib/data/runways.json'))
base=root/'public/data';search={};geo={};details={};major=[]
def normal(s):return ''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c))
for row in rows:
 row[13]=normal(row[13]);ident=row[0]
 details.setdefault(ident[:2].lower(),{})[ident]={'record':row[:13],'runways':runways.get(ident,[])}
 if row[1]=='closed':continue
 keys={word[:2] for word in re.findall(r'[^\W_]+',row[13]) if len(word)>=2}
 for key in keys:search.setdefault(key,[]).append(row)
 cell=f'{math.floor((row[4]+180)/10)}_{math.floor((row[3]+90)/10)}';geo.setdefault(cell,[]).append(row[:13])
 if row[1]=='large_airport':major.append(row[:13])
for name,data in [('airport-search',search),('airport-cells',geo),('airport-details',details)]:
 path=base/name;path.mkdir(exist_ok=True)
 for k,v in data.items():
  # percent-encoded non-ASCII shard names are intentionally avoided by search; fallback unsupported below.
  if not re.fullmatch('[a-z0-9_]+',k):continue
  (path/(k+'.json')).write_text(json.dumps(v,separators=(',',':'),ensure_ascii=False))
(base/'major-airports.json').write_text(json.dumps(major,separators=(',',':'),ensure_ascii=False))
print({'search_shards':len(search),'geo_cells':len(geo),'detail_shards':len(details),'major_airports':len(major)})
