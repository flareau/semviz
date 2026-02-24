import re
from graphviz import Digraph

class SemR:

    def __init__(self, text):
        self.subgraphs = self.__parse(text)

    def __parse(self, text):
        text = self.__clean(text)
        if text.startswith('['):
            return self.__parse_subgraphs(text)
        else:
            return {None: self.__parse_subgraph(text)}

    def __clean(self, text):
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r' ?([:#\(\),\[\]\&]) ?', r'\1', text)
        return text.strip()

    def __parse_subgraphs(self, text):
        m = re.match(r'^(\[([\w</>\-]+) ([^\]]+)\])+$', text)
        if m:
            subgraphs = re.findall(r'\[([\w</>\-]+) ([^\]]+)\]', text)
        else:
            raise Exception(f"Can't parse subgraphs: {text}")
        return {s: self.__parse_subgraph(t) for (s,t) in subgraphs}

    def __parse_subgraph(self, text):
        return [self.__parse_node(n) for n in text.split('&')]

    def __parse_node(self, text):
        node = text.split(':')
        if len(node) == 1:
            pred, args = self.__parse_pred(node[0])
            handle = pred
        elif len(node) == 2:
            handle = self.__parse_handle(node[0])
            pred, args = self.__parse_pred(node[1])
        else:
            raise Exception(f"Can't parse node: {text}")
        return handle, pred, args

    def __parse_pred(self, text):
        m = re.match(r'^([^\(\)]+)(\((.+)\))?$', text)
        if len(m.groups()) == 3:
            sem, _, args = m.groups()
        elif len(m.groups()) == 1:
            sem = m.groups(1)
            args = []
        else:
            raise Exception(f"Can't parse predicate: {text}")
        return self.__parse_sem(sem), self.__parse_args(args)

    def __parse_handle(self, text):
        if re.match(r'^\w+$', text):
            return text
        else:
            raise Exception(f"Can't parse handle: {text}")

    def __parse_sem(self, text):
        sem = text.split('#')
        if len(sem) == 1:
            return self.__parse_lemma(sem[0])
        elif len(sem) == 2:
            return '#'.join((self.__parse_lemma(sem[0]), self.__parse_sensenum(sem[1])))
        else:
            raise Exception(f"Can't parse semanteme: {text}")

    def __parse_lemma(self, text):
        m = re.match(r"^[\w'\-]+$", text)
        if m:
            return m.group(0)
        else:
            raise Exception(f"Can't parse semanteme: {text}")

    def __parse_sensenum(self, text):
        # num = re.match(r"^\d+[a-z]?$", text)
        num = re.match(r"^(0|(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z])(\.(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z]))*)$", text)
        if num:
            return num.group(0)
        else:
            raise Exception(f"Can't parse sense number: {text}")

    def __parse_args(self, text):
        if text:
            args = [self.__parse_sem(arg) for arg in text.split(',')]
        else:
            args = []
        return args

    def __handle_pred(self, handle, pred):
        if handle == pred:
            return pred
        else:
            return f"{handle}:{pred}"

    def __str__(self):
        substrings = []
        for subgraph, nodes in self.subgraphs.items():
            nodes = [f"{self.__handle_pred(handle, pred)}({','.join(args)})" for (handle, pred, args) in nodes]
            substring = ' & '.join(nodes)
            if subgraph != None:
                substring = f'[{subgraph} {substring}]'
            substrings.append(substring)
        string = ' '.join(substrings)
        return re.sub(r'\(\)', '', string)

    def graphviz(self, quotes=True, spaces=True, prettynum=True, label=None, dominance=True, engine='dot'):
        dot = Digraph(engine=engine, format='gv')
        dot.attr('graph', margin='0')
        dot.attr('graph', splines='true')
        if label:
            dot.attr('graph', label=label)
        dot.attr('node', shape='plaintext')
        dot.attr('edge', arrowhead='vee')
        sg_index = {h: sg for (sg, nodes) in self.subgraphs.items() for (h, _, _) in nodes}
        for subgraph, nodes in self.subgraphs.items():
            if subgraph:
                sg_name = 'cluster_'+subgraph
                sg_label = f'<<b>{subgraph}</b>>'
            else:
                sg_name = 'cluster_0'
                sg_label = ''
            sg_nodes = [handle for (handle, _, _) in nodes]
            with dot.subgraph(name=sg_name, graph_attr={'style': 'rounded', 'label': sg_label, 'ranksep': '0', 'nodesep': '0'}) as sg:
                dominant = True
                for (handle, pred, args) in nodes:
                    if prettynum and len(pred.split('#')) == 2:
                        lemma, num = pred.split('#')
                        pred = f'{lemma}<sub><font point-size="8">{num}</font></sub>'
                    if spaces:
                        pred = re.sub('_', ' ', pred).strip()
                    if dominance and dominant:
                        pred = f"<u>{pred}</u>"
                        pred = pred.replace('<sub>', '</u><sub>')
                        pred = pred.replace('</sub></u>', '</sub>')
                    if quotes:
                        pred = f"‘{pred}’"
                    pred = f'<{pred}>'
                    sg.node(handle, pred)
                    for i, arg in enumerate(args, 1):
                        dot.node(arg)
                        if arg not in sg_index:
                            sg.node(arg)
                            constraint  = 'true'
                        elif sg_index[arg] == subgraph:
                            constraint = 'true'
                        else:
                            constraint = 'false'
                        dot.edge(handle, arg, label=str(i), constraint=constraint)
                    dominant = False
        return dot

    def graph(self, quotes=True, spaces=True, label=None, dominance=True, engine='dot', format='pdf'):
        dot = self.graphviz(quotes=quotes, spaces=spaces, label=label, dominance=dominance, engine=engine)
        dot.format = format
        return dot.pipe()
