# Clipping-Based Graphics Application
Computer Graphics – Assignment 10 | Prepared by Simran Waghamre | 25101B2009

## Project Introduction
An interactive Flask web application that demonstrates **clipping** – removing the parts of graphical objects that lie outside a viewing region – through three case studies plus an algorithm lab.

## Features
- **GIS Map** – fictional map (roads, river, buildings, lake, park, boundaries, landmarks); move/resize the clipping window, zoom, pan, "Show Clipping Process" (outside parts in red, visible parts in green, region codes and intersection points), live information panel. Geometry is clipped by Python via `/api/clip-scene`.
- **Video Editor** – video frame with draggable rectangle, circle, text and image-shape; the portion outside the frame is clipped; timeline bar; Add/Clear/Reset/Move controls.
- **Image Viewer** – upload an image (or use the sample); zoom, pan, reset, center; only the portion inside the window is drawn; size/zoom/position info.
- **About Clipping** – theory, region-code diagram, advantages, performance notes.
- **Line Clipping Lab** (About page, `#lab`) – enter a line and window; Python's Cohen-Sutherland returns inside/outside/partial, the clipped coordinates and the step log (`/api/clip-line`).
- **Polygon Clipping Lab** (About page, `#polygon-lab`) – enter polygon vertices and a window; Python's Sutherland-Hodgman returns the clipped polygon and the result after each window edge (`/api/clip-polygon`).

## Technologies Used
Python 3, Flask, HTML5 (Canvas, SVG), CSS3, vanilla JavaScript (only for interactive graphics). No React, Node.js, database or external API.

## Clipping Algorithms Used
- **Cohen-Sutherland line clipping** (`clipping/cohen_sutherland.py`) – GIS lines, Algorithm Lab, rectangular region-code tests.
- **Sutherland-Hodgman polygon clipping** (`clipping/polygon_clipping.py`, mirrored in `static/js/clipping.js`) – GIS polygons, video objects, image rectangle.
- **Liang-Barsky** – explained on the About page.

## Install Dependencies
```
cd clipping_graphics_app
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Run
```
python app.py
```
Open http://127.0.0.1:5000/

## Expected Output
- Home: introduction and three application buttons.
- GIS: map where only the content inside the blue window is coloured; counts change as you move/resize/zoom.
- Video editor: objects cut at the yellow frame edge.
- Image viewer: only the part of the image inside the blue window is shown.
- Lab: green visible line segment with status badge (Completely inside / outside / Partially clipped).

## Project Structure
```
clipping_graphics_app/
├── app.py
├── requirements.txt
├── README.md
├── clipping/        (__init__.py, cohen_sutherland.py, polygon_clipping.py)
├── templates/       (base, index, gis, video_editor, image_viewer, about .html)
└── static/
    ├── css/style.css
    └── js/          (gis.js, video_editor.js, image_viewer.js, clipping.js)
```
