"""Sutherland-Hodgman polygon clipping against a rectangular window."""


def clip_with_stages(poly, w):
    """Return (final_polygon, stages). stages = result after each window edge."""
    xmin, ymin, xmax, ymax = w
    edges = [
        ("left", lambda p: p[0] >= xmin, lambda a, b: (xmin, a[1] + (b[1] - a[1]) * (xmin - a[0]) / (b[0] - a[0]))),
        ("right", lambda p: p[0] <= xmax, lambda a, b: (xmax, a[1] + (b[1] - a[1]) * (xmax - a[0]) / (b[0] - a[0]))),
        ("top", lambda p: p[1] >= ymin, lambda a, b: (a[0] + (b[0] - a[0]) * (ymin - a[1]) / (b[1] - a[1]), ymin)),
        ("bottom", lambda p: p[1] <= ymax, lambda a, b: (a[0] + (b[0] - a[0]) * (ymax - a[1]) / (b[1] - a[1]), ymax)),
    ]
    out = [tuple(p) for p in poly]
    stages = []
    for name, inside, inter in edges:
        inp, out = out, []
        if inp:
            s = inp[-1]
            for e in inp:
                if inside(e):
                    if not inside(s):
                        out.append(inter(s, e))
                    out.append(e)
                elif inside(s):
                    out.append(inter(s, e))
                s = e
        stages.append({"edge": name, "points": [list(p) for p in out]})
    return [list(p) for p in out], stages


def sutherland_hodgman(poly, w):
    return clip_with_stages(poly, w)[0]
