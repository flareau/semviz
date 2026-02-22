class SemR {
  constructor(text) {
    const subgraphs = this.#parse(text);
    this.#validateReferencedAliases(subgraphs);
    this.subgraphs = subgraphs;
  }

  #clean(text) {
    const collapsed = text.replace(/\s+/g, " ");
    return collapsed.replace(/ ?([:#()\[\],&]) ?/g, "$1").trim();
  }

  #parse(text) {
    const cleaned = this.#clean(text);
    if (cleaned.startsWith("[")) {
      return this.#parseSubgraphs(cleaned);
    }
    return [{ id: null, name: null, nodes: this.#parseSubgraph(cleaned) }];
  }

  #parseSubgraphs(text) {
    const full = /^(\[([\p{L}\p{M}\p{N}_</>\-]+) ([^\]]+)\])+$/u;
    if (!full.test(text)) {
      throw new Error(`Can't parse subgraphs: ${text}`);
    }

    const matches = [...text.matchAll(/\[([\p{L}\p{M}\p{N}_</>\-]+) ([^\]]+)\]/gu)];
    const labelCounts = new Map();
    const subgraphs = [];
    for (const m of matches) {
      const label = m[1];
      const count = (labelCounts.get(label) ?? 0) + 1;
      labelCounts.set(label, count);
      subgraphs.push({
        id: `${label}:${count}`,
        name: label,
        nodes: this.#parseSubgraph(m[2]),
      });
    }
    return subgraphs;
  }

  #parseSubgraph(text) {
    return text.split("&").map((n) => this.#parseNode(n));
  }

  #parseNode(text) {
    const node = text.split(":");
    if (node.length === 1) {
      const [pred, args] = this.#parsePred(node[0]);
      return [pred, pred, args];
    }
    if (node.length === 2) {
      const handle = this.#parseHandle(node[0]);
      const [pred, args] = this.#parsePred(node[1]);
      return [handle, pred, args];
    }
    throw new Error(`Can't parse node: ${text}`);
  }

  #parsePred(text) {
    const match = text.match(/^([^()]+)(\((.+)\))?$/u);
    if (!match) {
      throw new Error(`Can't parse predicate: ${text}`);
    }
    const sem = match[1];
    const args = match[3] ?? "";
    return [this.#parseSem(sem), this.#parseArgs(args)];
  }

  #parseHandle(text) {
    if (/^[\p{L}\p{M}\p{N}_]+$/u.test(text)) {
      return text;
    }
    throw new Error(`Can't parse handle: ${text}`);
  }

  #parseSem(text) {
    const sem = text.split("#");
    if (sem.length === 1) {
      return this.#parseLemma(sem[0]);
    }
    if (sem.length === 2) {
      return `${this.#parseLemma(sem[0])}#${this.#parseSenseNum(sem[1])}`;
    }
    throw new Error(`Can't parse semanteme: ${text}`);
  }

  #parseLemma(text) {
    if (/^[\p{L}\p{M}\p{N}_'\-]+$/u.test(text)) {
      return text;
    }
    throw new Error(`Can't parse semanteme: ${text}`);
  }

  #parseSenseNum(text) {
    const pattern = /^(0|(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z])(\.(I|II|III|IV|V|VI|VII|VIII|IX|X|[1-9]\d*|[A-Z]))*)$/u;
    if (pattern.test(text)) {
      return text;
    }
    throw new Error(`Can't parse sense number: ${text}`);
  }

  #parseArgs(text) {
    if (!text) {
      return [];
    }
    return text.split(",").map((arg) => this.#parseArg(arg));
  }

  #parseArg(text) {
    if (text === "_") {
      return "_";
    }
    if (/^\p{Lu}$/u.test(text)) {
      return text;
    }
    if (/^[\p{L}][\p{L}\p{N}]*$/u.test(text)) {
      return text;
    }
    throw new Error(`Can't parse argument: ${text}`);
  }

  #isVariable(arg) {
    return /^\p{Lu}$/u.test(arg);
  }

  #validateReferencedAliases(subgraphs) {
    const knownHandles = new Set();
    for (const { nodes: subgraphNodes } of subgraphs) {
      for (const [handle] of subgraphNodes) {
        knownHandles.add(handle);
      }
    }

    for (const { nodes: subgraphNodes } of subgraphs) {
      for (const [, , args] of subgraphNodes) {
        for (const arg of args) {
          if (arg === "_" || this.#isVariable(arg)) {
            continue;
          }
          if (!knownHandles.has(arg)) {
            throw new Error(`Undefined alias argument: ${arg}`);
          }
        }
      }
    }
  }

  #handlePred(handle, pred) {
    return handle === pred ? pred : `${handle}:${pred}`;
  }

  #normalizePredicate(pred, { quotes, spaces, showLexnum, hideLexnum }) {
    let normalized = pred;
    const shouldShowLexnum = hideLexnum === undefined ? showLexnum : !hideLexnum;
    if (!shouldShowLexnum) {
      normalized = normalized.replace(/#.+$/u, "");
    }
    if (spaces) {
      normalized = normalized.replace(/_/g, " ").trim();
    }
    if (quotes) {
      normalized = `‘${normalized}’`;
    }
    return normalized;
  }

  toString() {
    const chunks = [];
    for (const { name, nodes } of this.subgraphs) {
      const serializedNodes = nodes.map(
        ([handle, pred, args]) => `${this.#handlePred(handle, pred)}(${args.join(",")})`,
      );
      let chunk = serializedNodes.join(" & ");
      if (name !== null) {
        chunk = `[${name} ${chunk}]`;
      }
      chunks.push(chunk);
    }
    return chunks.join(" ").replace(/\(\)/g, "");
  }

  cytoscape({ quotes = true, spaces = true, dominance = true, showLexnum = true, hideLexnum = undefined } = {}) {
    const nodes = [];
    const edges = [];
    const knownHandles = new Set();
    const referencedArgs = new Set();
    const implicitVariableOwners = new Map();
    const shouldShowLexnum = hideLexnum === undefined ? showLexnum : !hideLexnum;

    for (const { nodes: subgraphNodes } of this.subgraphs) {
      for (const [handle] of subgraphNodes) {
        knownHandles.add(handle);
      }
    }

    for (const { id, name } of this.subgraphs) {
      if (name === null) {
        continue;
      }
      nodes.push({
        data: {
          id: `subgraph:${id}`,
          label: name,
        },
        classes: "subgraph",
      });
    }

    let edgeIndex = 0;

    for (const { id, name, nodes: subgraphNodes } of this.subgraphs) {
      let dominant = true;
      for (const [handle, rawPred, args] of subgraphNodes) {
        const nodeClasses = [];
        if (dominance && dominant) {
          nodeClasses.push("dominant");
        }

        const splitAt = rawPred.indexOf("#");
        const hasVisibleLexnum = shouldShowLexnum && splitAt >= 0;
        const nodeData = {
          id: handle,
          label: hasVisibleLexnum
            ? this.#normalizePredicate(rawPred, { quotes, spaces, showLexnum, hideLexnum: true })
            : this.#normalizePredicate(rawPred, { quotes, spaces, showLexnum, hideLexnum }),
        };

        if (name !== null) {
          nodeData.parent = `subgraph:${id}`;
        }

        nodes.push({
          data: nodeData,
          classes: nodeClasses.join(" "),
        });

        if (hasVisibleLexnum) {
          const lexnumId = `lexnum:${handle}`;
          const lexnumData = {
            id: lexnumId,
            label: rawPred.slice(splitAt + 1),
            lexnumFor: handle,
          };
          if (name !== null) {
            lexnumData.parent = `subgraph:${id}`;
          }
          nodes.push({
            data: lexnumData,
            classes: "lexnum-node",
            grabbable: false,
            selectable: false,
          });
          edges.push({
            data: {
              id: `e${edgeIndex}`,
              source: handle,
              target: lexnumId,
              label: "",
            },
            classes: "lexnum-edge",
          });
          edgeIndex += 1;
        }

        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          if (arg === "_") {
            continue;
          }
          if (!knownHandles.has(arg) && this.#isVariable(arg) && !implicitVariableOwners.has(arg)) {
            implicitVariableOwners.set(arg, id);
          }
          referencedArgs.add(arg);
          const edgeData = {
            id: `e${edgeIndex}`,
            source: handle,
            target: arg,
            label: String(i + 1),
          };
          edges.push({ data: edgeData });
          edgeIndex += 1;
        }

        dominant = false;
      }
    }

    for (const arg of referencedArgs) {
      if (knownHandles.has(arg)) {
        continue;
      }
      const argData = {
        id: arg,
        label: arg,
      };
      const ownerSubgraphId = implicitVariableOwners.get(arg);
      if (ownerSubgraphId !== undefined && ownerSubgraphId !== null) {
        argData.parent = `subgraph:${ownerSubgraphId}`;
      }
      nodes.push({ data: argData });
    }

    return { nodes, edges };
  }
}

export { SemR };
