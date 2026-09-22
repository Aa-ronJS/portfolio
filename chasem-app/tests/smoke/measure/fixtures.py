# The two files that are not renders: a photo the browser cannot decode at all, and one that decodes to a
# single pixel. Both must come back as a plain "no" from the app, not a hang.
import struct, zlib, os
here = os.path.dirname(os.path.abspath(__file__))
open(os.path.join(here, 'text.jpg'), 'wb').write(b'This is not a JPEG at all.')
def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(b'\x00\xff\xff\xff'))
       + chunk(b'IEND', b''))
open(os.path.join(here, 'one.png'), 'wb').write(png)
print('text.jpg and one.png written')
