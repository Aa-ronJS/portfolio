# music/

Drop background tracks here (mp3, wav, m4a, flac, ogg). Anything you have
the right to use on YouTube — the YouTube Audio Library (Studio → Audio
library) is the safe source, and it is free.

A track whose filename contains the script's mood is preferred for that
mood: `calm`, `curious`, `tense`, `upbeat`, `melancholy`. So
`curious-synth-bed.mp3` plays under curious episodes. With no match, any
track here is used; with nothing here and `music.jamendo` off, the video
goes out with narration only.

Tracks are not committed (see the root `.gitignore`); on the GitHub
Action, turn on `music.jamendo` in `channel.yaml` instead, which pulls a
Creative Commons track per episode and credits it in the description.
