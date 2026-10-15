# Video maker: script -> narrated, captioned, branded MP4. ffmpeg + a tiny web UI.
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core curl && rm -rf /var/lib/apt/lists/*
COPY app.py /app.py
EXPOSE 8080
CMD ["python3", "/app.py"]
