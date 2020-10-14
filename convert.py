import semviz
from flask import Flask, request, render_template, Markup

app = Flask(__name__)

@app.route('/')
def form():
    return render_template('form.html')

@app.route('/', methods=['POST'])
def form_post():
    formula = request.form['formula']
    try:
        semr = semviz.parse(formula)
    except:
        message = "Il y a une erreur dans la formule."
        return render_template('error.html', message=message)
    clean = semviz.logform(semr)
    try:
        svg = Markup(semviz.graph(semr, format='svg').decode('utf-8'))
    except:
        message = "Erreur dans la génération du graphe."
        return render_template('error.html', message=message)
    return render_template('result.html', formula=clean, svg=svg)
