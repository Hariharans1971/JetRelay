"""Validate and publish immutable public aviation reference snapshots.
No customer, operator, booking or private document data is read by this job.
A manifest is published last so readers never see a partially uploaded version.
"""
from __future__ import annotations
import argparse,csv,datetime,hashlib,json,logging,os,pathlib,shutil,subprocess,sys,tempfile,time,urllib.request,uuid
SOURCES={
 'airports.csv':'https://davidmegginson.github.io/ourairports-data/airports.csv',
 'runways.csv':'https://davidmegginson.github.io/ourairports-data/runways.csv',
 'countries.csv':'https://davidmegginson.github.io/ourairports-data/countries.csv',
 'world.geojson':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'}
LIMIT=30*1024*1024
ROOT=pathlib.Path(__file__).resolve().parents[2]
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def log(status,**fields):print(json.dumps({'status':status,'at':stamp(),**fields}),flush=True)
def download(url,path):
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'AeroShareReferenceImporter/1.0','Accept':'text/csv,application/json'})
   with urllib.request.urlopen(req,timeout=30) as response,open(path,'wb') as output:
    total=0
    while True:
     chunk=response.read(65536)
     if not chunk:break
     total+=len(chunk)
     if total>LIMIT:raise ValueError('Source download exceeds size limit')
     output.write(chunk)
   return
  except Exception:
   path.unlink(missing_ok=True)
   if attempt==2:raise
   time.sleep(2**attempt)
def read_rows(path,required):
 with open(path,encoding='utf-8-sig',newline='')as f:
  reader=csv.DictReader(f)
  if not set(required)<=set(reader.fieldnames or []):raise ValueError('Required source columns are missing: '+path.name)
  return list(reader)
def validate_sources(source):
 airports=read_rows(source/'airports.csv',['ident','name','latitude_deg','longitude_deg','iso_country','type','icao_code','iata_code'])
 if not 75000<=len(airports)<=300000:raise ValueError('Airport count changed outside the reviewed safety range')
 seen=set();countries=set()
 for a in airports:
  ident=a['ident'];lat=float(a['latitude_deg']);lon=float(a['longitude_deg'])
  if not ident or ident in seen or not(-90<=lat<=90 and -180<=lon<=180):raise ValueError('Duplicate identifier or invalid source coordinates')
  seen.add(ident);countries.add(a['iso_country'])
 if len(countries)<200:raise ValueError('Global source coverage fell unexpectedly')
 runways=read_rows(source/'runways.csv',['airport_ident','length_ft','width_ft','le_ident','he_ident','surface','closed'])
 if not 40000<=len(runways)<=250000:raise ValueError('Runway count changed outside the reviewed safety range')
 read_rows(source/'countries.csv',['code','name'])
 world=json.loads((source/'world.geojson').read_text())
 if world.get('type')!='FeatureCollection' or len(world.get('features',[]))<150:raise ValueError('Geographic source is not the expected global reference')
 return {'airports':len(airports),'runways':len(runways),'country_territory_codes':len(countries)}
def same_sources(previous,current):
 return bool(previous)and all(previous.get('reference',{}).get('files',{}).get(k,{}).get('sha256')==v.get('sha256')for k,v in current['files'].items())
def publish_snapshot(client,bucket,data_dir,meta,now=None):
 checked=now or stamp();previous=None
 try:previous=json.loads(client.get_object(Bucket=bucket,Key='manifest.json')['Body'].read())
 except client.exceptions.NoSuchKey:pass
 if same_sources(previous,meta):
  manifest={**previous,'last_checked_at':checked}
  client.put_object(Bucket=bucket,Key='manifest.json',Body=json.dumps(manifest).encode(),ContentType='application/json',CacheControl='no-cache',ServerSideEncryption='AES256')
  return {'changed':False,'manifest':manifest,'objects_uploaded':0}
 version=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:10]
 prefix='snapshots/'+version+'/';files=sorted(p for p in data_dir.rglob('*')if p.is_file())
 for path in files:
  rel=path.relative_to(data_dir).as_posix()
  client.upload_file(str(path),bucket,prefix+rel,ExtraArgs={'ContentType':'application/json' if path.suffix in ['.json','.geojson']else'application/octet-stream','CacheControl':'public, max-age=31536000, immutable','ServerSideEncryption':'AES256'})
 manifest={'schema_version':1,'version':version,'reference_prefix':prefix,'last_checked_at':checked,'reference':meta,'objects_uploaded':len(files),'licence':'OurAirports and Natural Earth: Public Domain','scope':'Public aviation reference data only'}
 client.put_object(Bucket=bucket,Key='manifest.json',Body=json.dumps(manifest).encode(),ContentType='application/json',CacheControl='no-cache',ServerSideEncryption='AES256')
 return {'changed':True,'manifest':manifest,'objects_uploaded':len(files)}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--sources',type=pathlib.Path);parser.add_argument('--publish',action='store_true');args=parser.parse_args()
 try:
  with tempfile.TemporaryDirectory(prefix='aeroshare-reference-')as tmp:
   work=pathlib.Path(tmp);source=work/'sources';source.mkdir()
   for name,url in SOURCES.items():
    if args.sources:shutil.copyfile(args.sources/name,source/name)
    else:download(url,source/name)
   stats=validate_sources(source);stage=work/'stage';(stage/'scripts').mkdir(parents=True);(stage/'lib/data').mkdir(parents=True);(stage/'public/data').mkdir(parents=True)
   for name in ['import-reference.py','shard-reference.py']:shutil.copyfile(ROOT/'scripts'/name,stage/'scripts'/name)
   subprocess.run([sys.executable,str(stage/'scripts/import-reference.py'),str(source)],check=True,stdout=subprocess.DEVNULL)
   subprocess.run([sys.executable,str(stage/'scripts/shard-reference.py')],check=True,stdout=subprocess.DEVNULL)
   meta=json.loads((stage/'lib/data/provenance.json').read_text());meta['country_names']=json.loads((stage/'lib/data/countries.json').read_text());(stage/'public/data/provenance.json').write_text(json.dumps(meta))
   if args.publish:
    bucket=os.environ.get('REFERENCE_BUCKET','')
    if not bucket or '/'in bucket:raise ValueError('REFERENCE_BUCKET is required for publishing')
    import boto3
    result=publish_snapshot(boto3.client('s3'),bucket,stage/'public/data',meta);log('SUCCESS',changed=result['changed'],objects_uploaded=result['objects_uploaded'],**stats)
   else:log('VALIDATED_NOT_PUBLISHED',**stats)
 except Exception as error:
  # Sources are public, but omit stack traces, cloud request bodies and credentials from routine logs.
  log('FAILED',error_type=type(error).__name__,message='Reference refresh failed; the previously published manifest is retained.')
  raise SystemExit(1)
if __name__=='__main__':main()
