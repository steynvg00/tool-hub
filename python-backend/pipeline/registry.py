"""Central registry of every pipeline step.

Each entry has: the function, a category (generator|modifier), a human label, and
a param schema. The frontend fetches this via GET /steps and builds its controls
automatically - so adding a new technique here makes it appear in the UI with no
frontend changes.
"""
from . import generators as g
from . import modifiers as m

# param schema types understood by the frontend: "number", "select", "bool", "point_list", "color"
REGISTRY = {
    # ---- generators ----
    "chroma_key": {
        "fn": g.chroma_key,
        "category": "generator",
        "label": "Chroma key (uniform color)",
        "params": {
            "tolerance": {"type": "number", "default": 40, "min": 0, "max": 200},
            "color": {"type": "color", "default": None, "help": "leave empty to auto-sample corners"},
        },
    },
    "flood_fill": {
        "fn": g.flood_fill,
        "category": "generator",
        "label": "Flood fill (magic wand)",
        "params": {
            "tolerance": {"type": "number", "default": 20, "min": 0, "max": 100},
            "seeds": {"type": "point_list", "default": None, "help": "empty = all 4 corners; add interior points for enclosed gaps"},
        },
    },
    "threshold": {
        "fn": g.threshold,
        "category": "generator",
        "label": "Threshold (brightness split)",
        "params": {
            "method": {"type": "select", "default": "otsu", "options": ["otsu", "fixed"]},
            "value": {"type": "number", "default": 127, "min": 0, "max": 255},
            "invert": {"type": "bool", "default": False},
        },
    },
    "grabcut": {
        "fn": g.grabcut,
        "category": "generator",
        "label": "GrabCut (general purpose)",
        "params": {
            "rect": {"type": "rect", "default": None, "help": "box around subject; empty = 5% inset"},
            "iterations": {"type": "number", "default": 5, "min": 1, "max": 15},
        },
    },
    "contour": {
        "fn": g.contour,
        "category": "generator",
        "label": "Edge contour (outlined objects)",
        "params": {
            "low": {"type": "number", "default": 50, "min": 0, "max": 500},
            "high": {"type": "number", "default": 150, "min": 0, "max": 500},
        },
    },
    # ---- modifiers ----
    "morphology": {
        "fn": m.morphology,
        "category": "modifier",
        "label": "Morphology (fill / clean edges)",
        "params": {
            "op": {"type": "select", "default": "close", "options": ["open", "close", "erode", "dilate"]},
            "kernel": {"type": "number", "default": 5, "min": 1, "max": 51},
            "iterations": {"type": "number", "default": 1, "min": 1, "max": 10},
        },
    },
    "feather": {
        "fn": m.feather,
        "category": "modifier",
        "label": "Feather (soft edges)",
        "params": {
            "radius": {"type": "number", "default": 3, "min": 1, "max": 30},
        },
    },
    "keep_largest": {
        "fn": m.keep_largest,
        "category": "modifier",
        "label": "Keep largest blob",
        "params": {},
    },
    "invert": {
        "fn": m.invert,
        "category": "modifier",
        "label": "Invert mask",
        "params": {},
    },
}


def list_steps():
    """Return a JSON-friendly description of all steps for the frontend."""
    return [
        {
            "type": key,
            "category": entry["category"],
            "label": entry["label"],
            "params": entry["params"],
        }
        for key, entry in REGISTRY.items()
    ]
