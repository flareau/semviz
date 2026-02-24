import re
from graphviz import Digraph


class SemR:
    def __init__(self, text):
        subgraphs = self.__parse(text)
        self.__validate_referenced_aliases(subgraphs)
        self.subgraphs = subgraphs

    def __parse(self, text):
        cleaned = self.__clean(text)
        if cleaned.startswith("["):
            return self.__parse_subgraphs(cleaned)
        return [{"id": None, "name": None, "nodes": self.__parse_subgraph(cleaned)}]

    def __clean(self, text):
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r" ?([:#\(\),\[\]\&]) ?", r"\1", text)
        return text.strip()

    def __parse_subgraphs(self, text):
        if not re.match(r"^(\[([\w</>\-]+) ([^\]]+)\])+$", text, flags=re.UNICODE):
            raise Exception(f"Can't parse subgraphs: {text}")
        matches = re.findall(r"\[([\w</>\-]+) ([^\]]+)\]", text, flags=re.UNICODE)
        label_counts = {}
        subgraphs = []
        for label, body in matches:
            count = label_counts.get(label, 0) + 1
            label_counts[label] = count
            subgraphs.append(
                {
                    "id": f"{label}:{count}",
                    "name": label,
                    "nodes": self.__parse_subgraph(body),
                }
            )
        return subgraphs

    def __parse_subgraph(self, text):
        return [self.__parse_node(n) for n in text.split("&")]

    def __parse_node(self, text):
        node = text.split(":")
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
        m = re.match(r"^([^()]+)(\((.+)\))?$", text, flags=re.UNICODE)
        if not m:
            raise Exception(f"Can't parse predicate: {text}")
        if len(m.groups()) == 3:
            sem, _, args = m.groups()
        else:
            sem = m.group(1)
            args = ""
        return self.__parse_sem(sem), self.__parse_args(args)

    def __parse_handle(self, text):
        if re.match(r"^\w+$", text, flags=re.UNICODE):
            return text
        raise Exception(f"Can't parse handle: {text}")

    def __parse_sem(self, text):
        sem = text.split("#")
        if len(sem) == 1:
            return self.__parse_lemma(sem[0])
        elif len(sem) == 2:
            return "#".join((self.__parse_lemma(sem[0]), self.__parse_sensenum(sem[1])))
        raise Exception(f"Can't parse semanteme: {text}")

    def __parse_lemma(self, text):
        m = re.match(r"^[\w'\-]+$", text, flags=re.UNICODE)
        if m:
            return m.group(0)
        raise Exception(f"Can't parse semanteme: {text}")

    def __parse_sensenum(self, text):
        pattern = r"^(0|(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z])(\.(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z]))*)$"
        if re.match(pattern, text, flags=re.UNICODE):
            return text
        raise Exception(f"Can't parse sense number: {text}")

    def __parse_args(self, text):
        if not text:
            return []
        return [self.__parse_arg(arg) for arg in text.split(",")]

    def __parse_arg(self, text):
        if text == "_":
            return "_"
        if len(text) == 1 and text.isalpha() and text.isupper():
            return text
        if text and text[0].isalpha() and all(ch.isalnum() for ch in text):
            return text
        raise Exception(f"Can't parse argument: {text}")

    def __is_variable(self, arg):
        return len(arg) == 1 and arg.isalpha() and arg.isupper()

    def __validate_referenced_aliases(self, subgraphs):
        known_handles = set()
        for subgraph in subgraphs:
            for handle, _, _ in subgraph["nodes"]:
                known_handles.add(handle)

        for subgraph in subgraphs:
            for _, _, args in subgraph["nodes"]:
                for arg in args:
                    if arg == "_" or self.__is_variable(arg):
                        continue
                    if arg not in known_handles:
                        raise Exception(f"Undefined alias argument: {arg}")

    def __handle_pred(self, handle, pred):
        if handle == pred:
            return pred
        return f"{handle}:{pred}"

    def __normalize_predicate(self, pred, quotes=True, spaces=True, showLexnum=True, hideLexnum=None):
        normalized = pred
        should_show_lexnum = showLexnum if hideLexnum is None else (not hideLexnum)
        if not should_show_lexnum:
            normalized = re.sub(r"#.+$", "", normalized, flags=re.UNICODE)
        if spaces:
            normalized = re.sub("_", " ", normalized, flags=re.UNICODE).strip()
        if quotes:
            normalized = f"‘{normalized}’"
        return normalized

    def __normalize_arg_label(self, arg, quotes=True, spaces=True):
        normalized = arg
        if spaces:
            normalized = re.sub("_", " ", normalized, flags=re.UNICODE).strip()
        if quotes:
            normalized = f"‘{normalized}’"
        return normalized

    def __str__(self):
        substrings = []
        for subgraph in self.subgraphs:
            nodes = subgraph["nodes"]
            serialized_nodes = [
                f"{self.__handle_pred(handle, pred)}({','.join(args)})" for (handle, pred, args) in nodes
            ]
            chunk = " & ".join(serialized_nodes)
            if subgraph["name"] is not None:
                chunk = f"[{subgraph['name']} {chunk}]"
            substrings.append(chunk)
        return re.sub(r"\(\)", "", " ".join(substrings))

    def graphviz(
        self,
        quotes=True,
        spaces=True,
        label=None,
        dominance=True,
        engine="dot",
        showLexnum=True,
        hideLexnum=None,
    ):
        dot = Digraph(engine=engine, format="gv")
        dot.attr("graph", margin="0")
        if label:
            dot.attr("graph", label=label)
        dot.attr("node", shape="plaintext")
        dot.attr("edge", arrowhead="vee")

        known_handles = set()
        node_owner = {}
        for subgraph in self.subgraphs:
            for handle, _, _ in subgraph["nodes"]:
                known_handles.add(handle)
                node_owner[handle] = subgraph["id"]

        implicit_variable_owners = {}
        for subgraph in self.subgraphs:
            subgraph_id = subgraph["id"]
            for _, _, args in subgraph["nodes"]:
                for arg in args:
                    if arg == "_":
                        continue
                    if arg not in known_handles and self.__is_variable(arg) and arg not in implicit_variable_owners:
                        implicit_variable_owners[arg] = subgraph_id

        node_owner.update(implicit_variable_owners)

        clusters = {}
        for subgraph in self.subgraphs:
            subgraph_id = subgraph["id"]
            subgraph_name = subgraph["name"]
            if subgraph_name is None:
                continue
            cluster_name = f"cluster_{subgraph_id.replace(':', '_')}"
            cluster = Digraph(name=cluster_name)
            cluster.attr(style="rounded", label=subgraph_name, ranksep="0", nodesep="0")
            clusters[subgraph_id] = cluster

        edges = []
        added_nodes = set()

        def add_node(node_id, node_label, owner_id=None, highlight=False):
            attrs = {}
            if highlight:
                attrs["fontcolor"] = "red4"

            target = clusters.get(owner_id)
            if target is None:
                dot.node(node_id, node_label, **attrs)
            else:
                target.node(node_id, node_label, **attrs)
            added_nodes.add(node_id)

        for subgraph in self.subgraphs:
            subgraph_id = subgraph["id"]
            dominant_node = True
            for handle, pred, args in subgraph["nodes"]:
                node_label = self.__normalize_predicate(
                    pred,
                    quotes=quotes,
                    spaces=spaces,
                    showLexnum=showLexnum,
                    hideLexnum=hideLexnum,
                )
                add_node(
                    handle,
                    node_label,
                    owner_id=subgraph_id,
                    highlight=(dominance and dominant_node),
                )

                for index, arg in enumerate(args, 1):
                    if arg == "_":
                        continue
                    if arg not in added_nodes and arg not in known_handles:
                        arg_owner = implicit_variable_owners.get(arg)
                        add_node(
                            arg,
                            self.__normalize_arg_label(arg, quotes=quotes, spaces=spaces),
                            owner_id=arg_owner,
                        )
                    edges.append((handle, arg, str(index), subgraph_id))
                dominant_node = False

        for source, target, edge_label, source_owner in edges:
            target_owner = node_owner.get(target)
            constraint = "true" if target_owner is None or target_owner == source_owner else "false"
            dot.edge(source, target, label=edge_label, constraint=constraint)

        for cluster in clusters.values():
            dot.subgraph(cluster)

        return dot

    def graph(
        self,
        quotes=True,
        spaces=True,
        label=None,
        dominance=True,
        engine="dot",
        format="pdf",
        showLexnum=True,
        hideLexnum=None,
    ):
        dot = self.graphviz(
            quotes=quotes,
            spaces=spaces,
            label=label,
            dominance=dominance,
            engine=engine,
            showLexnum=showLexnum,
            hideLexnum=hideLexnum,
        )
        dot.format = format
        return dot.pipe()
