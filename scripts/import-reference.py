"""Import unmodified OurAirports downloads into a compact, provenance-tagged snapshot.
Usage: python scripts/import-reference.py /absolute/path/to/downloads
The fetch step is separate, so imports never silently replace a deployed snapshot.
"""
import csv,json,sys,hashlib,datetime
from pathlib import Path
src=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]
countries={r['code']:r['name'] for r in csv.DictReader(open(src/'countries.csv'))}
airports=[];invalid=0
for r in csv.DictReader(open(src/'airports.csv')):
 try:
  lat,lon=float(r['latitude_deg']),float(r['longitude_deg'])
  if not (-90<=lat<=90 and -180<=lon<=180): raise ValueError()
 except ValueError: invalid+=1;continue
 airports.append([r['ident'],r['type'],r['name'],lat,lon,int(r['elevation_ft']) if r['elevation_ft'] else None,r['iso_country'],r['iso_region'],r['municipality'],r['icao_code'],r['iata_code'],r['gps_code'],r['scheduled_service']=='yes',(' '.join([r['ident'],r['name'],r['municipality'],r['icao_code'],r['iata_code'],r['gps_code'],r['iso_country'],countries.get(r['iso_country'],''),r['keywords']])).casefold()])
runways={}
for r in csv.DictReader(open(src/'runways.csv')):
 def number(k):
  try:return int(float(r[k])) if r[k] else None
  except ValueError:return None
 runways.setdefault(r['airport_ident'],[]).append([r['le_ident'],r['he_ident'],number('length_ft'),number('width_ft'),r['surface'],r['lighted']=='1',r['closed']=='1'])
(out/'lib/data/airports.json').write_text(json.dumps(airports,separators=(',',':'),ensure_ascii=False))
(out/'lib/data/runways.json').write_text(json.dumps(runways,separators=(',',':'),ensure_ascii=False))
(out/'lib/data/countries.json').write_text(json.dumps(countries,separators=(',',':'),ensure_ascii=False))
world=json.load(open(src/'world.geojson'))
for f in world['features']:
 p=f['properties'];f['properties']={'name':p.get('NAME'),'country_code':p.get('ISO_A2')}
(out/'public/data/world.geojson').write_text(json.dumps(world,separators=(',',':'),ensure_ascii=False))
meta={'imported_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'airports':len(airports),'countries':len(set(a[6] for a in airports)),'runway_airports':len(runways),'runways':sum(map(len,runways.values())),'invalid_coordinates_skipped':invalid,'airport_source':'https://ourairports.com/data/','airport_licence':'Public Domain','geography_source':'https://www.naturalearthdata.com/','geography_licence':'Public Domain','files':{f:{'sha256':hashlib.sha256((src/f).read_bytes()).hexdigest(),'bytes':(src/f).stat().st_size} for f in ['airports.csv','runways.csv','countries.csv','world.geojson']}}
(out/'lib/data/provenance.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta,indent=2))
