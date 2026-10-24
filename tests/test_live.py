import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import django
from dotenv import load_dotenv

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from database.mongodb import connect_mongodb
from nlp_engine.workflow.executor import execute_nlp_job
from nlp_engine.schemas import NLPJobRequest

load_dotenv()
uri = os.getenv('MONGODB_URI')
print('Connecting to MongoDB Atlas...')
res = connect_mongodb(uri)
cid = res['connection_id']
print(f'Connected! Connection ID: {cid}')
print(f'Discovered Databases: {res.get("databases")}')

# Test 1: Language Detection on Events.news_events
print('\n[1] Testing Language Detection on Events.news_events (field: domain)...')
req_lang = NLPJobRequest(
    connection_id=cid,
    database='Events',
    collection='news_events',
    text_field='domain',
    task='language_detection',
    limit=5
)
job_lang = execute_nlp_job(req_lang)
print(f'Status: {"SUCCESS" if not job_lang.error else "ERROR: " + str(job_lang.error)}')
print(f'Processed: {job_lang.processed_documents}/{job_lang.total_documents}')
if job_lang.results:
    for r in job_lang.results[:3]:
        print(f"  - ID {r['_id']}: {r['language_name']} ({r['language_code']}) conf={r['confidence']}")

# Test 2: Deduplication on Events.news_events
print('\n[2] Testing Deduplication on Events.news_events (field: domain)...')
req_dedup = NLPJobRequest(
    connection_id=cid,
    database='Events',
    collection='news_events',
    text_field='domain',
    task='deduplication',
    limit=20
)
job_dedup = execute_nlp_job(req_dedup)
print(f'Status: {"SUCCESS" if not job_dedup.error else "ERROR: " + str(job_dedup.error)}')
res_d = job_dedup.results
print(f"  - Total: {res_d.get('total_docs')}, Unique: {res_d.get('unique_count')}, Duplicates: {res_d.get('duplicate_count')}")
print(f"  - Exact Dup Groups: {len(res_d.get('exact_duplicate_groups', []))}")

# Test 3: Keywords on droneDB.drones
print('\n[3] Testing Keywords on droneDB.drones (field: system_name)...')
req_kw = NLPJobRequest(
    connection_id=cid,
    database='droneDB',
    collection='drones',
    text_field='system_name',
    task='keywords',
    limit=5
)
job_kw = execute_nlp_job(req_kw)
print(f'Status: {"SUCCESS" if not job_kw.error else "ERROR: " + str(job_kw.error)}')
if job_kw.results:
    for r in job_kw.results[:3]:
        print(f"  - ID {r['_id']} [{r.get('text_preview')}]: {r.get('keywords')}")

# Test 4: Sentiment Analysis on droneDB.drones
print('\n[4] Testing Sentiment Analysis on droneDB.drones (field: system_name)...')
req_sent = NLPJobRequest(
    connection_id=cid,
    database='droneDB',
    collection='drones',
    text_field='system_name',
    task='sentiment',
    limit=3
)
job_sent = execute_nlp_job(req_sent)
print(f'Status: {"SUCCESS" if not job_sent.error else "ERROR: " + str(job_sent.error)}')
if job_sent.results:
    for r in job_sent.results[:3]:
        print(f"  - ID {r['_id']} [{r.get('text_preview')}]: {r.get('label')} (score: {r.get('score')})")

print('\nALL LIVE TESTS COMPLETE!')
