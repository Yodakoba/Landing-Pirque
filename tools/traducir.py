#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera las versiones en inglés y portugués del sitio a partir del español.

    python3 tools/traducir.py            # escribe en/ y pt/
    python3 tools/traducir.py --revisar  # no escribe: avisa si algo quedó viejo

El español es la fuente de verdad y vive en la raíz del repo. Este script
lee esos archivos, cambia cada texto por su traducción y escribe copias en
en/ y pt/. Esas dos carpetas NO se editan a mano: lo que se les haga se
pierde en la próxima corrida.

Las traducciones viven en traducciones/en.json y traducciones/pt.json, con
el texto en español como llave. Cuando el mismo español necesita
traducciones distintas según la página, se usa una llave calificada:

    "reservas.html|Reserva"

que le gana a la llave suelta "Reserva" solo en ese archivo.

Si falta una traducción, el script lo dice y termina con error en vez de
publicar una página a medio traducir sin que nadie se entere. --revisar
además compara lo generado contra lo que hay en disco, así que delata el
caso típico: alguien editó el español y se le olvidó correr esto.

No hay que instalar nada: solo python3.
"""

import argparse
import json
import os
import re
import sys
import urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Dominio de producción, para los hreflang que le dicen a Google que estas
# páginas son la misma en otro idioma. Google los quiere absolutos. Si el
# sitio queda en otro dominio, esta línea es lo único que hay que cambiar.
SITIO = 'https://brasasdelopirque.cl'

IDIOMAS = ['es', 'en', 'pt']
ETIQUETAS = {'es': 'ES', 'en': 'EN', 'pt': 'PT'}
NOMBRES = {'es': 'Español', 'en': 'English', 'pt': 'Português'}

# Los archivos que se traducen: los de la raíz. assets/ se comparte entre
# los tres idiomas y no se copia.
PAGINAS = [
    '404.html', 'actividades.html', 'contacto.html', 'eventos.html',
    'experiencias.html', 'index.html', 'landing-afiliados.html',
    'reservas.html',
]

# contacto.html redirige al instante a reservas.html: un selector de
# idiomas ahí no alcanza a servirle a nadie.
SIN_SELECTOR = {'contacto.html'}

# Estas dos van con noindex, así que los hreflang no tendrían a quién
# hablarle: Google no las indexa.
SIN_ALTERNATE = {'404.html', 'contacto.html'}

# Atributos cuyo valor lee una persona, y que por lo tanto se traducen.
ATRIBUTOS = ('alt', 'title', 'placeholder', 'aria-label')

TAG = re.compile(r'(<[^>]*>)')
ABRE_OPACO = re.compile(r'<\s*(script|style)\b', re.I)
CIERRA_OPACO = re.compile(r'<\s*/\s*(script|style)\s*>', re.I)
BLOQUE_IDIOMAS = re.compile(r'<!--i18n-->.*?<!--/i18n-->', re.S)
BLOQUE_ALTERNATE = re.compile(r'<!--i18n:alternate-->.*?<!--/i18n:alternate-->', re.S)

# Marcas internas: los dos bloques de arriba se sacan del texto antes de
# traducir y se vuelven a poner después, para que su contenido no pase por
# el diccionario. Llevan caracteres que no existen en el HTML fuente.
MARCA_IDIOMAS = '\x00i18n-idiomas\x00'
MARCA_ALTERNATE = '\x00i18n-alternate\x00'

# Texto que queda igual en los tres idiomas: números, precios, teléfonos,
# horarios, correos, dominios y puntuación suelta. Se reconoce por su
# forma, así que no hay que repetirlo en cada diccionario.
INTACTO = re.compile(r"""
    ^(?:
        [\s·—–\-|/:.,()]+               # separadores sueltos
      | [·\s]*\+?[\d\s.,$%°ºª:/()+-]+   # números, precios, teléfonos, horarios
      | [·\s]*[\w.+-]+@[\w.-]+          # correos
      | [·\s]*(?:https?://|www\.)\S+    # urls
      | [·\s]*[\w-]+\.(?:cl|com|net|org)  # dominios
    )$
""", re.X)

# Nombres propios y marcas que no se traducen aunque sean palabras.
PROPIOS = {
    'Brasas de Lo Pirque', 'Lo Pirque', 'Pirque', 'Shopify', 'WhatsApp',
    'Casas de San Vicente', 'Región Metropolitana', 'Santiago',
    'Tradiciones', 'Sommelier', 'Brasas', 'A Brasas abiertas',
    'ES', 'EN', 'PT',
}


def texto_fijo(t):
    """¿Este texto queda igual en los tres idiomas?"""
    return bool(INTACTO.match(t)) or t in PROPIOS


# ----------------------------------------------------------------------
# diccionarios
# ----------------------------------------------------------------------

def cargar(idioma):
    ruta = os.path.join(RAIZ, 'traducciones', idioma + '.json')
    if not os.path.exists(ruta):
        return {}
    with open(ruta, encoding='utf-8') as f:
        return json.load(f)


class Traductor(object):
    """Busca una traducción; primero la calificada por archivo."""

    def __init__(self, dicc, idioma):
        self.dicc = dicc
        self.idioma = idioma
        self.pagina = None
        self.faltantes = []
        self.usadas = set()

    def __call__(self, texto):
        t = ' '.join(texto.split())
        if not t or t.startswith('\x00'):
            return texto

        # El diccionario se consulta antes que texto_fijo(), para que una
        # entrada explícita pueda ganarle a la regla de forma. Hace falta
        # sobre todo con los precios: "$44.000" es plata chilena bien
        # escrita, pero en inglés se lee como cuarenta y cuatro dólares.
        for llave in (self.pagina + '|' + t, t):
            if llave in self.dicc:
                self.usadas.add(llave)
                return conservar_espacios(texto, self.dicc[llave])

        if texto_fijo(t):
            return texto

        self.faltantes.append((self.pagina, t))
        return texto


def conservar_espacios(original, traduccion):
    """Pone la traducción respetando los espacios y saltos de línea que
    rodeaban al original, para que el HTML generado quede igual de
    legible que el español."""
    izq = len(original) - len(original.lstrip())
    der = len(original) - len(original.rstrip())
    return original[:izq] + traduccion + (original[len(original) - der:] if der else '')


# ----------------------------------------------------------------------
# los dos bloques que arma el script
# ----------------------------------------------------------------------

def ruta_relativa(pagina, desde, hacia):
    """URL de `pagina` en el idioma `hacia`, vista desde el idioma `desde`."""
    prefijo = '' if desde == 'es' else '../'
    carpeta = '' if hacia == 'es' else hacia + '/'
    return prefijo + carpeta + pagina


def selector_idiomas(pagina, idioma):
    """El selector ES · EN · PT de la barra superior.

    El markup lo arma el script para los tres idiomas, español incluido,
    así que vive en un solo lugar. verificar_fuente() comprueba que el
    bloque escrito en el archivo español sea exactamente este: si alguien
    lo edita a mano en el HTML, la corrida avisa."""
    partes = ['<!--i18n--><nav class="idiomas" aria-label="Idioma">']
    for otro in IDIOMAS:
        if otro == idioma:
            partes.append('<span aria-current="true">%s</span>' % ETIQUETAS[otro])
        else:
            partes.append(
                '<a href="%s" hreflang="%s" lang="%s">%s</a>' % (
                    ruta_relativa(pagina, idioma, otro), otro, otro,
                    ETIQUETAS[otro]))
    partes.append('</nav><!--/i18n-->')
    return ''.join(partes)


def enlaces_alternate(pagina):
    """Los <link rel="alternate" hreflang> del <head>: le dicen a Google
    que estas tres páginas son la misma en distinto idioma. Son iguales en
    los tres idiomas y x-default apunta al español."""
    filas = ['<!--i18n:alternate-->']
    for otro in IDIOMAS:
        filas.append('<link rel="alternate" hreflang="%s" href="%s/%s">'
                     % (otro, SITIO, ruta_relativa(pagina, 'es', otro)))
    filas.append('<link rel="alternate" hreflang="x-default" href="%s/%s">'
                 % (SITIO, pagina))
    filas.append('<!--/i18n:alternate-->')
    return '\n'.join(filas)


# ----------------------------------------------------------------------
# traducción de una página
# ----------------------------------------------------------------------

def escapar(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')


def desescapar(s):
    return s.replace('&quot;', '"').replace('&amp;', '&')


def traducir_whatsapp(url, traducir):
    """El mensaje que WhatsApp deja escrito también se traduce."""
    partido = urllib.parse.urlsplit(url)
    params = urllib.parse.parse_qsl(partido.query, keep_blank_values=True)
    if not any(k == 'text' for k, _ in params):
        return url
    nuevos = [(k, traducir(v) if k == 'text' else v) for k, v in params]
    return urllib.parse.urlunsplit(partido._replace(
        query=urllib.parse.urlencode(nuevos, quote_via=urllib.parse.quote)))


def traducir_etiqueta(tag, traducir, idioma):
    """Una etiqueta HTML: atributos legibles, rutas y el lang del <html>."""
    if tag.startswith('<!--') or tag.startswith('<?'):
        return tag

    for attr in ATRIBUTOS:
        tag = re.sub(
            r'\b' + attr + r'="([^"]*)"',
            lambda m, a=attr: '%s="%s"' % (
                a, escapar(traducir(desescapar(m.group(1))))),
            tag)

    # <html lang="es"> pasa al idioma de la copia.
    if re.match(r'<html\b', tag, re.I):
        tag = re.sub(r'lang="es"', 'lang="%s"' % idioma, tag)

    # La descripción que se lee en los resultados de búsqueda.
    if 'name="description"' in tag:
        tag = re.sub(
            r'content="([^"]*)"',
            lambda m: 'content="%s"' % escapar(traducir(desescapar(m.group(1)))),
            tag)

    # en/ y pt/ cuelgan un nivel más abajo, así que assets/ les queda arriba.
    if idioma != 'es':
        tag = re.sub(r'\b(src|href)="assets/', r'\1="../assets/', tag)

    # El mensaje prellenado de WhatsApp.
    if 'wa.me/' in tag:
        tag = re.sub(
            r'href="(https://wa\.me/[^"]*)"',
            lambda m: 'href="%s"' % escapar(
                traducir_whatsapp(desescapar(m.group(1)), traducir)),
            tag)

    return tag


def traducir_pagina(fuente, pagina, traducir, idioma):
    traducir.pagina = pagina

    # Los bloques que arma el script salen del texto antes de traducir:
    # su contenido no tiene por qué pasar por el diccionario.
    fuente = BLOQUE_IDIOMAS.sub(MARCA_IDIOMAS, fuente)
    fuente = BLOQUE_ALTERNATE.sub(MARCA_ALTERNATE, fuente)

    salida = []
    opaco = 0
    for seg in TAG.split(fuente):
        if seg.startswith('<'):
            if ABRE_OPACO.match(seg) and not seg.rstrip().endswith('/>'):
                opaco += 1
            elif CIERRA_OPACO.match(seg):
                opaco = max(0, opaco - 1)
            salida.append(traducir_etiqueta(seg, traducir, idioma))
        elif opaco:
            salida.append(seg)
        else:
            salida.append(traducir(seg))

    texto = ''.join(salida)
    texto = texto.replace(MARCA_IDIOMAS, selector_idiomas(pagina, idioma))
    texto = texto.replace(MARCA_ALTERNATE, enlaces_alternate(pagina))
    return texto


# ----------------------------------------------------------------------

def verificar_fuente(fuente, pagina, problemas):
    """El español de la raíz tiene que traer los dos bloques del script, y
    su selector tiene que ser idéntico al que el script genera."""
    esperado = selector_idiomas(pagina, 'es')
    hallado = BLOQUE_IDIOMAS.search(fuente)
    if pagina in SIN_SELECTOR:
        if hallado:
            problemas.append('%s: no debería traer selector de idiomas' % pagina)
    elif not hallado:
        problemas.append('%s: falta el bloque <!--i18n--> del selector de idiomas'
                         % pagina)
    elif hallado.group(0) != esperado:
        problemas.append(
            '%s: el selector de idiomas del archivo no coincide con el que\n'
            '    genera el script. Si el cambio es a propósito, va en\n'
            '    selector_idiomas(); si no, pega esta línea en el HTML:\n'
            '    %s' % (pagina, esperado))
    if pagina in SIN_ALTERNATE:
        if BLOQUE_ALTERNATE.search(fuente):
            problemas.append('%s: va con noindex, no debería traer hreflang'
                             % pagina)
    elif not BLOQUE_ALTERNATE.search(fuente):
        problemas.append('%s: falta el bloque <!--i18n:alternate--> del <head>'
                         % pagina)


def main():
    ap = argparse.ArgumentParser(
        description='Genera en/ y pt/ a partir del español de la raíz.')
    ap.add_argument('--revisar', action='store_true',
                    help='no escribe: avisa si falta traducción o si lo '
                         'generado no coincide con lo que hay en disco')
    args = ap.parse_args()

    problemas, faltantes, sobrantes, desfasados = [], [], [], []
    escritos = 0

    fuentes = {}
    for pagina in PAGINAS:
        ruta = os.path.join(RAIZ, pagina)
        if not os.path.exists(ruta):
            problemas.append('%s: no existe' % pagina)
            continue
        with open(ruta, encoding='utf-8') as f:
            fuentes[pagina] = f.read()
        verificar_fuente(fuentes[pagina], pagina, problemas)

    for idioma in IDIOMAS:
        if idioma == 'es':
            continue
        traducir = Traductor(cargar(idioma), idioma)
        carpeta = os.path.join(RAIZ, idioma)
        if not args.revisar:
            os.makedirs(carpeta, exist_ok=True)

        for pagina, fuente in sorted(fuentes.items()):
            salida = traducir_pagina(fuente, pagina, traducir, idioma)
            destino = os.path.join(carpeta, pagina)
            if args.revisar:
                actual = None
                if os.path.exists(destino):
                    with open(destino, encoding='utf-8') as f:
                        actual = f.read()
                if actual != salida:
                    desfasados.append(os.path.join(idioma, pagina))
            else:
                with open(destino, 'w', encoding='utf-8') as f:
                    f.write(salida)
                escritos += 1

        for pagina, texto in traducir.faltantes:
            faltantes.append((idioma, pagina, texto))
        # Las llaves que parten con "_" son comentarios del diccionario,
        # no traducciones: no se esperan usadas.
        declaradas = {k for k in traducir.dicc if not k.startswith('_')}
        for llave in sorted(declaradas - traducir.usadas):
            sobrantes.append((idioma, llave))

    for p in problemas:
        print('PROBLEMA  ' + p, file=sys.stderr)

    if faltantes:
        print('\nFaltan traducciones (%d apariciones):' % len(faltantes),
              file=sys.stderr)
        vistos = set()
        for idioma, pagina, texto in faltantes:
            if (idioma, texto) in vistos:
                continue
            vistos.add((idioma, texto))
            print('  [%s] %s: %s' % (idioma, pagina, texto), file=sys.stderr)

    if sobrantes:
        print('\nLlaves del diccionario que ya no usa ninguna página (%d):'
              % len(sobrantes), file=sys.stderr)
        for idioma, llave in sobrantes:
            print('  [%s] %s' % (idioma, llave), file=sys.stderr)

    if desfasados:
        print('\nEstas páginas generadas no coinciden con el español (%d).'
              % len(desfasados), file=sys.stderr)
        print('Corre: python3 tools/traducir.py', file=sys.stderr)
        for d in desfasados:
            print('  ' + d, file=sys.stderr)

    if problemas or faltantes or desfasados:
        return 1

    if args.revisar:
        print('Todo al día: %d páginas × %d idiomas, nada pendiente.'
              % (len(fuentes), len(IDIOMAS) - 1))
    else:
        print('Escritas %d páginas en %s.'
              % (escritos, ' y '.join(i for i in IDIOMAS if i != 'es')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
