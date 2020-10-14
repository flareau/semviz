import semviz

FORMATS = ['gv', 'pdf', 'jpg']

def test(filename, quotes=True, spaces=True, dominance=True):
    with open(filename) as f:
        for i, line in enumerate([line.strip() for line in f.readlines() if line.strip()], 1):
            graph = semviz.parse(line)
            label = semviz.logform(graph)+'\n'+line
            dot = semviz.graphviz(graph, label=label, quotes=quotes, spaces=spaces, dominance=dominance)
            for format in FORMATS:
                with open('.'.join([filename, str(i), format]), 'wb') as f:
                    f.write(semviz.layout(dot, format=format))

test(filename='tests/test1.txt')
