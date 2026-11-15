"""
Lit le fichier Excel REMPLI par le locuteur ewé (phrases_a_traduire_ewe.xlsx) et crée serveur/phrases_ewe.json.

Usage :   python serveur/importer_phrases_ewe.py chemin/vers/phrases_a_traduire_ewe.xlsx
Nécessite : pip install pandas openpyxl
"""
import json
import sys
from pathlib import Path

import pandas as pd

if len(sys.argv) < 2:
    sys.exit("Usage : python serveur/importer_phrases_ewe.py fichier.xlsx")

df = pd.read_excel(sys.argv[1], sheet_name="Phrases")
col_ee = "Ewé (à remplir)"
rempli = df.dropna(subset=["Français", col_ee])
rempli = rempli[rempli[col_ee].astype(str).str.strip() != ""]

catalogue = {str(r["ID"]): {"fr": str(r["Français"]).strip(), "ee": str(r[col_ee]).strip()} for _, r in rempli.iterrows()}
sortie = Path(__file__).resolve().parent / "phrases_ewe.json"
sortie.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"{len(catalogue)} phrase(s) ewé importée(s) sur {len(df)} -> {sortie}")
manquantes = df[~df["ID"].isin(catalogue)]
print(f"{len(manquantes)} phrase(s) sans traduction (ignorées par l'assistant) ; 5 premières :")
for _, r in manquantes.head(5).iterrows():
    print("  ", r["ID"], r["Français"])
