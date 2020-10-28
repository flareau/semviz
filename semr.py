import re
from graphviz import Digraph

class SemR:

    def __init__(self, sems=None):
        self.nodes = self.__parse(sems)

    def __clean(self, text):
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r' ?([:#\(\),\[\]\&]) ?', r'\1', text)
        return text.strip()

    def __parse_lemma(self, text):
        m = re.match(r"^[\w'\-]+$", text)
        if m:
            return m.group(0)
        else:
            raise Exception(f"Can't parse semanteme: {text}")

    def __parse_sensenum(self, text):
        num = re.match(r"^\d+[a-z]?$", text)
        if num:
            return num.group(0)
        else:
            raise Exception(f"Can't parse sense number: {text}")

    def __parse_sem(self, text):
        sem = text.split('#')
        if len(sem) == 1:
            return self.__parse_lemma(sem[0])
        elif len(sem) == 2:
            return '#'.join((self.__parse_lemma(sem[0]), self.__parse_sensenum(sem[1])))
        else:
            raise Exception(f"Can't parse semanteme: {text}")

    def __parse_args(self, text):
        if text:
            args = [self.__parse_sem(arg) for arg in text.split(',')]
        else:
            args = []
        return args

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

    def __parse(self, text):
        text = self.__clean(text)
        return [self.__parse_node(n) for n in text.split('&')]

    def __handle_pred(self, handle, pred):
        if handle == pred:
            return pred
        else:
            return f"{handle}:{pred}"

    def __str__(self):
        nodes = [f"{self.__handle_pred(handle, pred)}({','.join(args)})" for (handle, pred, args) in self.nodes]
        string = ' & '.join(nodes)
        return re.sub(r'\(\)', '', string)

    def graphviz(self, quotes=True, spaces=True, label=None, dominance=True, engine='dot'):
        dot = Digraph(engine=engine, format='gv')
        dot.attr('graph', margin='0')
        if label:
            dot.attr('graph', label=label)
        dot.attr('node', shape='plaintext')
        dot.attr('edge', arrowhead='vee')
        if dominance:
            dominant = True
        for (handle, pred, args) in self.nodes:
            if quotes:
                handle = f"‘{handle}’"
                pred = f"‘{pred}’"
            if spaces:
                handle = re.sub('_', ' ', handle).strip()
                pred = re.sub('_', ' ', pred).strip()
            if dominant:
                dot.node(handle, pred, fontcolor='red4')
            else:
                dot.node(handle, pred)
            for i, arg in enumerate(args, 1):
                if quotes:
                    arg = f"‘{arg}’"
                if spaces:
                    arg = re.sub('_', ' ', arg).strip()
                dot.node(arg)
                dot.edge(handle, arg, label=str(i))
            dominant = False
        return dot

    def graph(self, quotes=True, spaces=True, label=None, dominance=True, engine='dot', format='pdf'):
        dot = self.graphviz(quotes=quotes, spaces=spaces, label=label, dominance=dominance, engine=engine)
        dot.format = format
        return dot.pipe()
