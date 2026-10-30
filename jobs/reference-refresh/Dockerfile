FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TMPDIR=/tmp
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin refresh
WORKDIR /app
COPY jobs/reference-refresh/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY jobs/reference-refresh/job.py ./jobs/reference-refresh/job.py
COPY scripts/import-reference.py scripts/shard-reference.py ./scripts/
USER 10001:10001
CMD ["python", "jobs/reference-refresh/job.py", "--publish"]
