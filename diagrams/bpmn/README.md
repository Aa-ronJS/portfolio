# Olympic Dam underground radio: BPMN 2.0 process set

`../olympic-dam-ug-radio-bpmn.pdf` is the deliverable (cover + 9 swimlane pages).
`out/*.bpmn` are standard BPMN 2.0 files (open in Camunda Modeler, bpmn.io, Signavio).

Rebuild:

    python3 build.py && python3 legend.py          # pages.py holds all content + layout
    node render.js <bpmn-js>/dist/bpmn-viewer.production.min.js   # needs bpmn-js + playwright
    # then merge out/_p*.pdf (listed in out/_pdfs.json) with pypdf

Layout: every node is placed at (lane, column, row) in `pages.py`; `build.py`
routes the orthogonal flows and warns if a flow crosses a node.
