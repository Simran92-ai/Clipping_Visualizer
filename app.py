from flask import Flask, render_template, request, jsonify
from clipping.cohen_sutherland import cohen_sutherland, outcode
from clipping.polygon_clipping import sutherland_hodgman, clip_with_stages

app = Flask(__name__)


def get_window(d):
    w = tuple(float(d["window"][k]) for k in ("xmin", "ymin", "xmax", "ymax"))
    if w[0] >= w[2] or w[1] >= w[3]:
        raise ValueError("Window needs xmin < xmax and ymin < ymax")
    return w


@app.route("/")
def index(): return render_template("index.html")
@app.route("/gis")
def gis(): return render_template("gis.html")
@app.route("/video-editor")
def video_editor(): return render_template("video_editor.html")
@app.route("/image-viewer")
def image_viewer(): return render_template("image_viewer.html")
@app.route("/about")
def about(): return render_template("about.html")


@app.route("/api/clip-line", methods=["POST"])
def api_clip_line():
    d = request.get_json(force=True, silent=True) or {}
    try:
        w = get_window(d)
        l = d["line"]
        return jsonify(cohen_sutherland(float(l["x1"]), float(l["y1"]), float(l["x2"]), float(l["y2"]), w))
    except (KeyError, TypeError, ValueError) as e:
        return jsonify(error=f"Invalid input: {e}"), 400


@app.route("/api/clip-polygon", methods=["POST"])
def api_clip_polygon():
    d = request.get_json(force=True, silent=True) or {}
    try:
        w = get_window(d)
        pts = [[float(x), float(y)] for x, y in d["polygon"]]
        if len(pts) < 3:
            raise ValueError("A polygon needs at least 3 vertices")
        final, stages = clip_with_stages(pts, w)
        if all(outcode(x, y, w) == 0 for x, y in pts):
            status = "inside"
        elif len(final) < 3:
            status, final = "outside", []
        else:
            status = "partial"
        return jsonify(status=status, clipped=final, stages=stages, original_count=len(pts))
    except (KeyError, TypeError, ValueError) as e:
        return jsonify(error=f"Invalid input: {e}"), 400


@app.route("/api/clip-scene", methods=["POST"])
def api_clip_scene():
    d = request.get_json(force=True, silent=True) or {}
    try:
        w = get_window(d)
        lines, after = [], 0
        for ln in d.get("lines", []):
            pts, segs, vis = ln["pts"], [], False
            for a, b in zip(pts, pts[1:]):
                r = cohen_sutherland(a[0], a[1], b[0], b[1], w)
                vis = vis or r["clipped"] is not None
                segs.append({"orig": [a[0], a[1], b[0], b[1]], "clipped": r["clipped"],
                             "codes": r["codes"], "status": r["status"]})
            after += vis
            lines.append({"segments": segs})
        polys = []
        for pg in d.get("polys", []):
            c = sutherland_hodgman(pg["pts"], w)
            after += len(c) >= 3
            polys.append({"clipped": c if len(c) >= 3 else []})
        points = []
        for p in d.get("points", []):
            v = outcode(p[0], p[1], w) == 0
            after += v
            points.append(v)
        before = len(lines) + len(polys) + len(points)
        return jsonify(lines=lines, polys=polys, points=points, before=before, after=int(after))
    except (KeyError, TypeError, ValueError, IndexError) as e:
        return jsonify(error=f"Invalid input: {e}"), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
