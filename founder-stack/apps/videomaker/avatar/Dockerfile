# AI presenter engine for the Video maker: a photo + narration -> talking-head video.
# SadTalker (Apache-2.0), running on CPU. Model weights (~1.3 GB) are fetched on first start.
FROM python:3.10-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg libgl1 libglib2.0-0 curl && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/OpenTalker/SadTalker /sadtalker && git -C /sadtalker checkout -q cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8 && rm -rf /sadtalker/.git
# torch 2.0-era pins: basicsr still imports torchvision.transforms.functional_tensor
RUN pip install --no-cache-dir torch==2.0.1+cpu torchvision==0.15.2+cpu torchaudio==2.0.2+cpu --extra-index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "numpy<1.24" face_alignment==1.3.5 imageio imageio-ffmpeg librosa==0.9.2 numba resampy pydub scipy kornia tqdm yacs pyyaml joblib scikit-image basicsr==1.4.2 facexlib==0.3.0 gfpgan av safetensors
COPY speed.py server.py /
RUN python3 /speed.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8090
CMD ["/entrypoint.sh"]
