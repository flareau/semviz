from semr import SemR
from flask import Flask, request, render_template, Markup, Response

app = Flask(__name__)

@app.route('/')
def form():
    return render_template('form.html')

@app.route('/', methods=['POST'])
def form_post():
    formula = request.form['formula']
    format = request.form['format']
    try:
        formula = formula.split('//')[0]  # ignore everything after //
        formula = formula.split('|')[0]  # ignore everything after |
        formula = formula.split('=')[-1] # ignore everything before =
        semr = SemR(formula)
    except:
        message = "Il y a une erreur dans la formule."
        return render_template('error.html', message=message)
    try:
        clean = str(semr)
        if format == 'print':
            svg = Markup(semr.graph(format='svg').decode('utf-8'))
            result = render_template('result.html', formula=clean, svg=svg)
        elif format == 'dot':
            result = Response(semr.graphviz().source, mimetype='text/plain')
        elif format == 'pdf':
            result = Response(semr.graph(format='pdf'), mimetype='application/pdf')
        elif format == 'jpg':
            result = Response(semr.graph(format='jpg'), mimetype='image/jpeg')
        else:
            raise Exception()
    except:
        message = "Erreur dans la génération du graphe."
        return render_template('error.html', message=message)
    return result
