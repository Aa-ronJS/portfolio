import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build
L = dict(num=0, id="lg", title="Legend", pool="Pool = the process",
  blackbox_bottom=[("lg_bb", "Another party (black-box pool)")],
  lanes=[("A", "Lane = who / what does it")],
  nodes=[("lg_s", "start", "A", 0, 0, "Start event"), ("lg_u", "user", "A", 1, 0, "User task: a person on a radio / console"),
         ("lg_m", "manual", "A", 2, 0, "Manual task: hands-on physical work"), ("lg_v", "service", "A", 3, 0, "Service task: equipment does it automatically"),
         ("lg_c", "call", "A", 4, 0, "Call activity [+]: detailed on its own page", {"calls": "x"}),
         ("lg_g", "xor", "A", 1, 1, "Exclusive gateway: take ONE path"), ("lg_o", "or", "A", 2, 1, "Inclusive: ALL that apply"),
         ("lg_ms", "startMsg", "A", 3, 1, "Message start"), ("lg_e", "end", "A", 4, 1, "End event"), ("lg_em", "endMsg", "A", 5, 1, "Message end")],
  flows=[("lg_s", "lg_u", "Sequence flow")],
  messages=[("lg_em", "lg_bb", "Message flow")])
open(os.path.join(build.OUT, "legend.bpmn"), "w").write(build.build(L))
