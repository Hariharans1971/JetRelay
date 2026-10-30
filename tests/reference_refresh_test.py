import importlib.util,io,json,pathlib,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reference_refresh',ROOT/'jobs/reference-refresh/job.py');job=importlib.util.module_from_spec(spec);spec.loader.exec_module(job)
class Missing(Exception):pass
class Client:
 class exceptions:NoSuchKey=Missing
 def __init__(self,previous=None,fail=False):self.previous=previous;self.fail=fail;self.events=[]
 def get_object(self,**kwargs):
  if self.previous is None:raise Missing()
  return {'Body':io.BytesIO(json.dumps(self.previous).encode())}
 def upload_file(self,path,bucket,key,**kwargs):
  if self.fail:raise RuntimeError('upload failed')
  self.events.append(('object',key))
 def put_object(self,**kwargs):self.events.append(('manifest',kwargs['Key']));self.written=json.loads(kwargs['Body'])
class RefreshTests(unittest.TestCase):
 def test_unchanged_source_keeps_import_time_and_only_records_a_check(self):
  meta={'imported_at':'old-import','files':{'airports.csv':{'sha256':'same'}}};old={'reference':meta,'reference_prefix':'snapshots/old/'};c=Client(old)
  with tempfile.TemporaryDirectory()as d:r=job.publish_snapshot(c,'ref-bucket',pathlib.Path(d),meta,now='new-check')
  self.assertFalse(r['changed']);self.assertEqual(c.written['reference']['imported_at'],'old-import');self.assertEqual(c.written['last_checked_at'],'new-check');self.assertEqual(c.events,[('manifest','manifest.json')])
 def test_manifest_is_written_after_all_snapshot_objects(self):
  c=Client();meta={'files':{'airports.csv':{'sha256':'new'}}}
  with tempfile.TemporaryDirectory()as d:
   p=pathlib.Path(d);(p/'one.json').write_text('{}');(p/'two.json').write_text('{}');r=job.publish_snapshot(c,'ref-bucket',p,meta)
  self.assertTrue(r['changed']);self.assertEqual([a for a,b in c.events],['object','object','manifest']);self.assertTrue(c.written['reference_prefix'].startswith('snapshots/'))
 def test_failed_upload_never_switches_the_active_manifest(self):
  c=Client(fail=True)
  with tempfile.TemporaryDirectory()as d:
   p=pathlib.Path(d);(p/'data.json').write_text('{}')
   with self.assertRaises(RuntimeError):job.publish_snapshot(c,'ref-bucket',p,{'files':{}})
  self.assertFalse(any(a=='manifest'for a,b in c.events))
 def test_missing_columns_are_rejected(self):
  with tempfile.TemporaryDirectory()as d:
   p=pathlib.Path(d)/'bad.csv';p.write_text('name\nExample\n')
   with self.assertRaises(ValueError):job.read_rows(p,['ident','name'])
if __name__=='__main__':unittest.main()
