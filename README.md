# semviz

Client-side semantic graph converter.

This project parses predicate-logic-like formulas and renders semantic graphs directly in the browser using `@hpcc-js/wasm` (Graphviz WebAssembly).

## Run

Because this is an ES module app, serve it with a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Input syntax

Examples:

```text
parler(r1, r2) & r1:roi(X, Cambodge) & r2:roi(Y, Espagne)
accuser#1(X,Y,Z,W)
```

Each node is separated by `&` and can be either:

- `pred(arg1,arg2,...)`
- `handle:pred(arg1,arg2,...)`

Sense numbers are supported with `#` (example: `punir#1`).
