## Format

- A semanteme name must not contain spaces; for multi-word expressions, use underscores.
  - `king`
  - `don't`
  - `give_up`
- A semanteme can be numbered to distinguish senses with `#` followed by a hierarchical numbering whose levels are separated by dots, with no spaces.
  - `black#I.A.2`
  - `go_on#II.C.1`
- You can define an alias for a semanteme with the `:` prefix. The alias must contain only letters and digits and start with a letter.
  - `b:black#I.A.2`
  - `sg1:singular`
- Predicate arguments are written in parentheses. An argument can be an alias or a variable (a single uppercase letter). Nested parentheses are not allowed. To omit an argument, use `_`.
  - `see(l, m) & l:Luke & m:Mary`
  - `see(X, Y)`
  - `neighbour(_, m) & m:me`
- Semantemes within the same subgraph are separated by `&`.
  - `s:sleep(l) & l:Luke & w:well(s) & very(w)`
  - `think(m, w) & m:Mary & w:want(l, s) & s:sleep(l) & l:Luke`
- You can group semantemes into subgraphs to indicate thematic structure. A subgraph is enclosed in brackets `[ ]`. The subgraph name appears immediately after the opening bracket. The first semanteme that follows is the communicatively dominant sense of that subgraph. Subgraphs are **not** separated by `&`.
  - `[Th c:cat & small(c)] [Rh s:sleep(c) & well(s)]`

## Examples

Try converting these formulas:

- `give_back#I.A.1(n,g,m) & n:neighbour#II(_, m) & g:guitar(m) & m:me#I`
- `[Th c:cat(j) & j:John & small(c) & black#I.A.2(c)] [Rh s:sleep(c) & well(s) & on(s, cp) & cp:carpet] [Spec think(m, s) & m:me]`
- `[Spec cause(f1, f2) & f1:fall(c) & c:Carl] [Th j:Jane] [Rh f2:fall(j)]`
- `[Spec time(d, m) & m:Monday] [Th e:exchange#III.1(s) & s:Shanghai & sg1:singular(e) & definite(e) & r:reopen(e) & after(r, w) & w:weekend & long(w) & sg2:singular(w) & indefinite(w) & past(r)] [Rh d:drop(e) & big(d) & past(d)]`