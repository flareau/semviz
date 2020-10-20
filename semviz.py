import re
from graphviz import Digraph

def parse(text):
    right = text.split('=')[-1] # keep only right-hand side of equation (if applicable)
    nodes = [n.strip() for n in right.split('&')]
    graph = []
    regex = r"^((\w+)\s*:\s*)?([\w'#]+)(\s*\((.+)\))?$"
    for node in nodes:
        try:
            m = re.match(regex, node)
            handle = m.group(2) or m.group(3) # if no handle, use pred
            pred = m.group(3)
            args = m.group(5)
        except:
            node = re.sub(r'\s+', ' ', node)
            raise Exception(f"Can't parse: {node}")
        if args:
            args = [a.strip() for a in args.split(',')]
            if None in [re.match(r"^[\w'#]+$", a) for a in args]: # If an arg doesn't match the format
                raise Exception(f"Can't parse: {node}")
        else:
            args = []
        graph.append((handle.strip(), pred.strip(), args))
    return graph

def handle_pred(handle, pred):
    if handle == pred:
        return pred
    else:
        return f"{handle}:{pred}"

def logform(graph):
    logform = ' & '.join([f"{handle_pred(handle, pred)}({', '.join(args)})" for (handle, pred, args) in graph])
    return re.sub(r'\(\)', '', logform)

def graphviz(graph, quotes=True, spaces=True, label=None, dominance=True, engine='dot'):
    dot = Digraph(engine=engine, format='gv')
    dot.attr('graph', margin='0')
    if label:
        dot.attr('graph', label=label)
    dot.attr('node', shape='plaintext')
    dot.attr('edge', arrowhead='vee')
    if dominance:
        dominant = True
    for (handle, pred, args) in graph:
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

def layout(dot, format='pdf'):
    dot.format = format
    return dot.pipe()
