from semr import SemR
from pathlib import Path

FORMATS = ['gv', 'pdf']
INDIR = 'tests/'
OUTDIR = 'tests/out/'

def test(filename, quotes=True, spaces=True, dominance=True):
    Path(OUTDIR).mkdir(parents=True, exist_ok=True)
    with open(INDIR+filename) as f:
        for i, line in enumerate([line.strip() for line in f.readlines() if line.strip()], 1):
            semr = SemR(line)
            label = str(semr)
            for format in FORMATS:
                with open('.'.join([OUTDIR+filename, str(i), format]), 'wb') as f:
                    f.write(semr.graph(label=label, quotes=quotes, spaces=spaces, dominance=dominance, format=format))

# test(filename='test1.txt')
test(filename='test2.txt')
