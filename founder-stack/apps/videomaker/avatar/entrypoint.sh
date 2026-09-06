#!/bin/sh
# Fetch the model weights once (about 1.3 GB from the projects' GitHub releases), then serve.
set -e
W=/weights; mkdir -p $W/checkpoints $W/gfpgan/weights
get() { [ -f "$W/$1" ] || curl -sSL --retry 3 -o "$W/$1" "$2"; }
get checkpoints/mapping_00109-model.pth.tar https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar
get checkpoints/mapping_00229-model.pth.tar https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar
get checkpoints/SadTalker_V0.0.2_256.safetensors https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors
get gfpgan/weights/alignment_WFLW_4HG.pth https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth
get gfpgan/weights/detection_Resnet50_Final.pth https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth
get gfpgan/weights/parsing_parsenet.pth https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth
rm -rf /sadtalker/checkpoints /sadtalker/gfpgan; ln -s $W/checkpoints /sadtalker/checkpoints; ln -s $W/gfpgan /sadtalker/gfpgan
exec python3 /server.py
