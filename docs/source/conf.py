# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

import os
import sys

# --- Paths para encontrar el backend (paquete neurocampus) ---
ROOT_DIR = os.path.abspath(os.path.join(__file__, "..", "..", ".."))
BACKEND_SRC = os.path.join(ROOT_DIR, "backend", "src")
DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_SRC)

project = 'NeuroCampus'
copyright = '2025, Daniel Felipe Ramirez Cabrera & Santiago Criollo Bermudez'
author = 'Daniel Felipe Ramirez Cabrera & Santiago Criollo Bermudez'
release = '0.1.0'
language = 'es'

# --- Extensiones de Sphinx ---
extensions = [
    "myst_parser",           # Markdown con MyST
]

# Configuración MyST (para poder usar toctree en .md)
myst_enable_extensions = [
    "deflist",
    "colon_fence",
]

# Tema
html_theme = "sphinx_rtd_theme"

templates_path = ["_templates"]
exclude_patterns = []
if not os.path.isdir(os.path.join(DOCS_DIR, "_templates")):
    templates_path = []

html_static_path = ["_static"]
if not os.path.isdir(os.path.join(DOCS_DIR, "_static")):
    html_static_path = []
