# Founder Stack Console: a small web UI that drives stackctl.
# Needs the docker CLI + compose plugin (to run the stack) and python3 (the app).
FROM docker:27-cli
RUN apk add --no-cache python3 bash curl openssl coreutils
COPY console.py /console.py
EXPOSE 8080
CMD ["python3", "/console.py"]
