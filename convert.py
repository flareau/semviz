import semviz
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
        graph = semviz.parse(formula)
    except:
        message = "Il y a une erreur dans la formule."
        return render_template('error.html', message=message)
    try:
        clean = semviz.logform(graph)
        dot = semviz.graphviz(graph)
        if format == 'print':
            svg = Markup(semviz.layout(dot, format='svg').decode('utf-8'))
            result = render_template('result.html', formula=clean, svg=svg)
        elif format == 'dot':
            result = Response(dot.source, mimetype='text/plain')
        elif format == 'pdf':
            result = Response(semviz.layout(dot, format='pdf'), mimetype='application/pdf')
        elif format == 'jpg':
            result = Response(semviz.layout(dot, format='jpg'), mimetype='image/jpeg')
        else:
            raise Exception()
    except:
        message = "Erreur dans la génération du graphe."
        return render_template('error.html', message=message)
    return result
