import semviz

def test(filename, quotes=True, spaces=True, format='pdf'):
    with open(filename) as f:
        for i, line in enumerate([line.strip() for line in f.readlines() if line.strip()], 1):
            semr = semviz.parse(line)
            # label = None
            # label = logform(semr)
            label = semviz.logform(semr)+'\n'+line
            with open('.'.join([filename, str(i), format]), 'wb') as f:
                f.write(semviz.graph(semr, label=label, quotes=quotes, spaces=spaces, format=format))

test(filename='tests/test1.txt', format='pdf')
