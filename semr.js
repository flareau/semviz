class SemR {
  constructor(text) {
    this.subgraphs = this.#parse(text);
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
    return new Map([[null, this.#parseSubgraph(cleaned)]]);
  }

  #parseSubgraphs(text) {
    const full = /^(\[([\p{L}\p{M}\p{N}_</>\-]+) ([^\]]+)\])+$/u;
    if (!full.test(text)) {
      throw new Error(`Can't parse subgraphs: ${text}`);
    }

    const matches = [...text.matchAll(/\[([\p{L}\p{M}\p{N}_</>\-]+) ([^\]]+)\]/gu)];
    const subgraphs = new Map();
    for (const m of matches) {
      subgraphs.set(m[1], this.#parseSubgraph(m[2]));
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
    return text.split(",").map((arg) => this.#parseSem(arg));
  }

  #handlePred(handle, pred) {
    return handle === pred ? pred : `${handle}:${pred}`;
  }

  toString() {
    const chunks = [];
    for (const [name, nodes] of this.subgraphs.entries()) {
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

  #quoteId(value) {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  #quoteDotString(value) {
    return this.#quoteId(value);
  }

  graphviz({ quotes = true, spaces = true, prettynum = true, label = null, dominance = true } = {}) {
    const lines = [
      "digraph {",
      "  graph [margin=0];",
      "  graph [splines=true];",
      "  node [shape=plaintext];",
      "  edge [arrowhead=vee];",
    ];

    if (label) {
      lines.push(`  graph [label=${this.#quoteDotString(label)}];`);
    }

    const sgIndex = new Map();
    const rootNodes = [];
    const rootEdges = [];
    for (const [name, nodes] of this.subgraphs.entries()) {
      for (const [handle] of nodes) {
        sgIndex.set(handle, name);
      }
    }

    for (const [name, nodes] of this.subgraphs.entries()) {
      const sgName = name ? `cluster_${name}` : "cluster_0";
      const sgLabel = name ? `<<b>${name}</b>>` : '""';

      lines.push(`  subgraph ${this.#quoteId(sgName)} {`);
      lines.push("    graph [style=rounded, ranksep=0, nodesep=0, label=" + sgLabel + "]; ");

      let dominant = true;
      for (const [handle, rawPred, args] of nodes) {
        let pred = rawPred;

        if (prettynum && pred.split("#").length === 2) {
          const [lemma, num] = pred.split("#");
          pred = `${lemma}<sub><font point-size=\"8\">${num}</font></sub>`;
        }
        if (spaces) {
          pred = pred.replace(/_/g, " ").trim();
        }
        if (quotes) {
          pred = `‘${pred}’`;
        }
        if (dominance && dominant) {
          pred = `<b>${pred}</b>`;
        }
        const htmlLabel = `<${pred}>`;
        lines.push(`    ${this.#quoteId(handle)} [label=${htmlLabel}];`);

        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          rootNodes.push(`  ${this.#quoteId(arg)};`);
          if (!sgIndex.has(arg) || sgIndex.get(arg) === name) {
            lines.push(`    ${this.#quoteId(arg)};`);
          }

          let constraint = "true";
          if (sgIndex.has(arg) && sgIndex.get(arg) !== name) {
            constraint = "false";
          }
          rootEdges.push(
            `  ${this.#quoteId(handle)} -> ${this.#quoteId(arg)} [label=${this.#quoteDotString(String(i + 1))}, constraint=${constraint}];`,
          );
        }

        dominant = false;
      }

      lines.push("  }");
    }

    lines.push(...rootNodes);
    lines.push(...rootEdges);
    lines.push("}");
    return lines.join("\n");
  }
}

export { SemR };
