## Format

- Le nom d'un sémantème ne doit pas contenir d'espaces; pour les locutions, utilisez la barre de soulignement.
  - `roi`
  - `s'en_prendre_plein_la_gueule`
  - `rendez-vous`
- Un sémantème peut être numéroté pour distinguer les acceptions avec le caractère `#` suivi d'une numérotation hiérarchique dont les niveaux sont séparés par un point, sans espaces.
  - `noir#I.A.2`
  - `se_rendre#II.C.1`
- On peut définir un alias pour un sémantème avec le préfixe `:`. L'alias ne doit contenir que des lettres et des chiffres et commencer par une lettre.
  - `n:noir#I.A.2`
  - `sg1:singulier`
- Les arguments d'un prédicat se mettent entre parenthèses. On peut utiliser des alias dans les parenthèses, mais on ne peut pas en définir de nouveaux. Un argument peut être une variable (une lettre majuscule). Il ne doit pas y avoir de parenthèses imbriquées.
  - `voir(Luc, Marie)`
  - `voir(l, m) & l:Luc & m:Marie`
  - `voir(X,Y)`
- Les sémantèmes d'un même sous-graphe sont séparés par le symbole `&`.
  - `d:dormir(Luc) & b:bien(d) & très(b)`
  - `penser(Marie, v) & v:vouloir(Luc, d) & d:dormir(Luc)`
- On peut regrouper les sémantèmes dans des sous-graphes pour indiquer la thématicité. Un sous-graphe est contenu entre crochets `[ ]`. Le nom du sous-graphe est donné immédiatement après le crochet ouvrant. Le premier sémantème qui suit est le sens communicativement dominant de ce sous-graphe. Les sous-graphes ne sont **pas** séparés par le symbole `&`.
  - `[Th c:chat & petit(c)] [Rh d:dormir(c) & bien(d)]`

## Exemples

Essayez de convertir ces formules:

- `rendre#I.A.1(v,g,m) & v:voisin#II(m) & g:guitare(m) & m:moi#I`
- `[Th c:chat(Julie) & petit(c) & noir(c)] [Rh d:dormir(c) & bien(d) & sur(d, tapis)] [Spéc penser(moi, d)]`
- `[Spéc causer(t1, t2) & t1:tomber(Carl) & Carl] [Th Jeanne] [Rh t2:tomber(Jeanne)]`
- `[Spéc temps(c, l)] [Th b:bourse(Shanghai) & sg1:singulier(b) & défini(b) & r:rouvrir(b) & après(r, fds) & fds:fin_de_semaine & long(fds) & sg2:singulier(fds) & indéfini(fds) & imparfait(r)] [Rh c:chuter(b) & brutal(c) & passé_composé(c)]`
