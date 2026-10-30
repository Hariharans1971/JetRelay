"""Refresh the public OurAirports snapshot. Run in GitHub Actions, never in a customer request.
Raw downloads are bounded. A failed import leaves the committed snapshot unchanged.
"""
import csv,datetime,hashlib,json,pathlib,shutil,subprocess,tarfile,tempfile,urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads((root/'lib/data/provenance.json').read_text())
with tempfile.TemporaryDirectory() as directory:
 tmp=pathlib.Path(directory);work=tmp/'work';raw=tmp/'raw';raw.mkdir();(work/'scripts').mkdir(parents=True);(work/'lib/data').mkdir(parents=True);(work/'public/data').mkdir(parents=True)
 for name in ['airports.csv','runways.csv','countries.csv']:
  req=urllib.request.Request('https://ourairports.com/data/'+name,headers={'User-Agent':'JetRelay reference refresh'})
  with urllib.request.urlopen(req,timeout=45) as response:
   data=response.read(32*1024*1024+1)
  if len(data)>32*1024*1024:raise ValueError('Reference download exceeds size limit')
  (raw/name).write_bytes(data)
 # Preserve existing geography and its source fingerprint. This job updates OurAirports only.
 world=json.loads((root/'public/data/world.geojson').read_text())
 for f in world['features']:f['properties']={'NAME':f['properties']['name'],'ISO_A2':f['properties']['country_code']}
 (raw/'world.geojson').write_text(json.dumps(world))
 for name in ['import-reference.py','shard-reference.py']:shutil.copyfile(root/'scripts'/name,work/'scripts'/name)
 subprocess.run(['python3',str(work/'scripts/import-reference.py'),str(raw)],check=True,capture_output=True)
 updated=json.loads((work/'lib/data/provenance.json').read_text())
 if not 75000<=updated['airports']<=300000 or not 40000<=updated['runways']<=250000:raise ValueError('Reference count validation failed')
 updated['files']['world.geojson']=meta['files']['world.geojson'];(work/'lib/data/provenance.json').write_text(json.dumps(updated,indent=2))
 subprocess.run(['python3',str(work/'scripts/shard-reference.py')],check=True,capture_output=True)
 # Validate known global identifiers before switching the snapshot.
 for prefix,ident in [('vo','VOMM'),('va','VABB'),('vi','VIDP'),('kj','KJFK'),('eg','EGLF')]:
  shard=json.loads((work/'public/data/airport-details'/f'{prefix}.json').read_text())
  if ident not in shard:raise ValueError('Global reference integrity check failed: '+ident)
 changed=any(updated['files'][n]['sha256']!=meta['files'][n]['sha256'] for n in ['airports.csv','runways.csv','countries.csv'])
 if changed:
  shutil.copyfile(root/'public/data/aviation-data-notice.html',work/'public/data/aviation-data-notice.html')
  archive=tmp/'snapshot.tgz'
  with tarfile.open(archive,'w:gz') as tar:tar.add(work/'public/data',arcname='public/data')
  parts=[];partdir=tmp/'parts';partdir.mkdir();blob=archive.read_bytes()
  for i,start in enumerate(range(0,len(blob),4000000)):
   data=blob[start:start+4000000];name=f'snapshot-{i:02d}.part';(partdir/name).write_bytes(data);parts.append({'name':name,'sha256':hashlib.sha256(data).hexdigest()})
  (partdir/'manifest.json').write_text(json.dumps({'format':'tar+gzip','parts':parts},indent=2)+'\n')
  shutil.rmtree(root/'render/reference');shutil.copytree(partdir,root/'render/reference')
  for name in ['countries.json','provenance.json']:shutil.copyfile(work/'lib/data'/name,root/'lib/data'/name)
 (root/'lib/data/sync.json').write_text(json.dumps({'last_checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'UPDATED' if changed else 'UNCHANGED','source':'OurAirports','schedule':'Daily at 00:00 UTC via GitHub Actions'},indent=2)+'\n')
 print('OurAirports snapshot '+('updated' if changed else 'unchanged'))
