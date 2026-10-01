"""Cohen-Sutherland line clipping. Screen coordinates: y grows downward, so ymin is the TOP edge."""
INSIDE, LEFT, RIGHT, BOTTOM, TOP = 0, 1, 2, 4, 8


def outcode(x, y, w):
    xmin, ymin, xmax, ymax = w
    c = INSIDE
    if x < xmin: c |= LEFT
    elif x > xmax: c |= RIGHT
    if y < ymin: c |= TOP
    elif y > ymax: c |= BOTTOM
    return c


def code_str(c):
    return format(c, "04b")  # bits: Top Bottom Right Left


def cohen_sutherland(x1, y1, x2, y2, w):
    xmin, ymin, xmax, ymax = w
    c1, c2 = outcode(x1, y1, w), outcode(x2, y2, w)
    first = (c1, c2)
    steps = [f"Region codes: P1 = {code_str(c1)}, P2 = {code_str(c2)}"]
    accept = False
    while True:
        if not (c1 | c2):
            steps.append("Both codes are 0000 -> trivially ACCEPT")
            accept = True
            break
        if c1 & c2:
            steps.append(f"{code_str(c1)} AND {code_str(c2)} = {code_str(c1 & c2)} (not 0000) -> trivially REJECT")
            break
        co = c1 or c2
        if co & TOP:
            x, y, edge = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1), ymin, "top"
        elif co & BOTTOM:
            x, y, edge = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1), ymax, "bottom"
        elif co & RIGHT:
            x, y, edge = xmax, y1 + (y2 - y1) * (xmax - x1) / (x2 - x1), "right"
        else:
            x, y, edge = xmin, y1 + (y2 - y1) * (xmin - x1) / (x2 - x1), "left"
        which = "P1" if co == c1 else "P2"
        if co == c1:
            x1, y1, c1 = x, y, outcode(x, y, w)
        else:
            x2, y2, c2 = x, y, outcode(x, y, w)
        steps.append(f"{which} is outside; cut at {edge} edge -> ({x:.2f}, {y:.2f}), new code {code_str(c1 if which == 'P1' else c2)}")
    status = "outside" if not accept else ("inside" if first == (0, 0) else "partial")
    return {"status": status,
            "codes": [code_str(first[0]), code_str(first[1])],
            "clipped": [x1, y1, x2, y2] if accept else None,
            "steps": steps}
