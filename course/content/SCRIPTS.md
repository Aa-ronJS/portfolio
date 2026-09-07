# Recording scripts

Three videos, one afternoon. The browser on the left half of the screen, the
editor on the right. No webcam. Laptop microphone in a quiet room is fine;
the buyer is paying for what you know, not the audio. Record each in one
take and cut only the mistakes. If you run long, cut explanation, never the
part where you type.

Two tabs open throughout: the portfolio at `/`, which has all five effects,
and the sales page at `/course`, which the buyer has just come from. Two
files open: the portfolio's `index.html`, and a plain starter page for the
demo. The demo page is a one-page site for an imaginary trades business with
a hero, three sections and a footer, no motion, one dark photograph in the
same grade as the others. Build it before you record; it is the "before".

---

## Video 01. The plate. (8 minutes)

**Cold open, the sales page, scrolling.** (0:00 to 0:50)

> You have just come from this page, so you have already seen everything I
> am going to teach you. The photograph behind the heading was moving at a
> different rate to the words. That is the whole trick, and it is the reason
> the page feels like it has depth rather than being a stack of rectangles.
>
> It is one CSS animation. No library, no scroll listener, no JavaScript at
> all. And it runs off the main thread, which means it physically cannot
> make the page stutter, which is more than most parallax libraries can say.

**The markup.** (0:50 to 2:30)

Show the hero in the portfolio's source: the `plate` wrapper, the
`plate__media` div with the image, the `plate__veil`. Three things, in that
order. Points to make:

- The media sits at `inset:-14% 0`, taller than the section on both ends,
  because it is going to travel and must never show its edge.
- `z-index:-2` for the image, `-1` for the veil, and `isolation:isolate` on
  the wrapper so those negatives stay inside it.
- The veil is two gradients: left-to-right so the type side is darkest, and
  top-to-bottom so the section edges are darkest. White type sits on it at
  every width because of the veil, not because of the photograph.

**The animation.** (2:30 to 4:30)

Show the `@supports (animation-timeline: view())` block.

> `animation-timeline: view()` means: do not drive this animation by time,
> drive it by how far this element has travelled through the viewport. Zero
> percent as it enters at the bottom, one hundred as it leaves at the top.
> The keyframes just move it from minus seven percent to plus seven, with a
> touch of scale so the edges never appear. That is all.
>
> Now the two wrappers around it, which matter more than the effect. The
> `@supports` means a browser that does not know this property ignores the
> whole block and the image simply sits there, full-bleed, static. That is
> not a fallback I had to design; it is the composition anyway. And inside
> it, `prefers-reduced-motion: no-preference`, so a reader who has asked
> their operating system for less motion also gets the still photograph.
> Nothing else to write. The degraded tier is designed first and it is free.

**Live: put a plate on the demo page.** (4:30 to 7:15)

Wrap the demo hero in `plate`, add the media and veil, paste the CSS from
the starter file. Reload. Scroll. Then:

- Narrow the window to phone width and scroll again. Point out the veil is
  doing the work of keeping the type readable.
- Open the browser's rendering settings, emulate `prefers-reduced-motion:
  reduce`, reload. The plate is still. Say: that is the test you run on
  everything from here on.

**Close.** (7:15 to 8:00)

> Before video two: one plate on your own page. One. Not three. The
> portfolio has two, on the two statement sections, and the project sections
> deliberately do not, because the same photograph as a plate and as a card
> on one screen read as a mistake. Pick your darkest photograph, add the
> veil, scroll it at phone width and at full width. Then come back.

---

## Video 02. Arrival. (8 minutes)

**Cold open, the portfolio's capability list, scrolling slowly.** (0:00 to 0:45)

> Watch the headings. They are not there, and then they are, and they
> arrive a beat apart. Watch the amber line draw itself across. Watch the
> number: it does not appear, it lands. None of that is a library either. It
> is one observer, about twenty lines of JavaScript, and three CSS classes.

**The classes.** (0:45 to 2:15)

Show `.rise`, `.wipe`, `.wipe-y` in the CSS.

- `.rise` starts at opacity zero and 28 pixels down. `.rise.in` is the
  finished state, with a transition. The transition lives on the `in` state,
  not the resting one, so removing the class would snap rather than animate.
- `--d` is the stagger. Each element sets its own delay inline: 80
  milliseconds, 160, 240. One custom property instead of a delay class per
  element.
- `.wipe` is `scaleX(0)` from the left, and `.wipe.in` is `scaleX(1)`. A one
  pixel tall element with an accent background. That is the hairline that
  draws itself.
- All of it is inside `prefers-reduced-motion: no-preference`. Outside that
  query the classes do nothing, so the elements are simply visible.

**The observer.** (2:15 to 4:00)

Show the script. Read it slowly.

> Everything with the class is collected. One IntersectionObserver watches
> them. When one crosses into view, it gets the `in` class and we stop
> watching it. The root margin pulls the trigger line up six percent from
> the bottom so things arrive when you can see them, not when a pixel of
> them exists.
>
> Now the rule, and this comes from a real defect. The hero's call to action
> was scroll-revealed, and the observer's margin meant it never fired, so
> the most important button on the page sat at opacity zero forever. The
> markup was perfect. Only looking at the screen showed it. So: anything
> already on screen at load, which is the hero, gets its class on the first
> animation frame. Only what is below waits for a scroll. Two selectors,
> `header` and everything else.

**The count-up.** (4:00 to 5:45)

Show `data-count` in the markup and the second observer.

> The real number lives in the markup. Not in the script, in the markup, so
> a search engine, a screen reader and a browser with JavaScript off all get
> the true figure. The script only animates toward it. The ease is a
> quartic: fast out, then slow, so the number lands rather than stops.
> Tabular figures in the CSS so the width does not jitter as digits change.
>
> And one rule with no exceptions. Every number that counts up is a real
> number. If you do not have one, do not fake one; use a different effect.
> This page counts to 37,729 because that is how many donations were
> re-matched. A page that counts to a round number nobody measured is
> lying, and people can feel it.

**Live: on the demo page.** (5:45 to 7:20)

Add `rise` to the three section headings with staggers, one `wipe` rule
under the first, and one honest number in `data-count` (the year the
business started is a fine one). Paste the script. Reload. Scroll. Emulate
reduced motion, reload: everything visible, the number already at its final
value.

**Close.** (7:20 to 8:00)

> Before video three: the rise class on every heading on your page, one
> hairline, one real number. Then press End on your keyboard to jump to the
> bottom and scroll back up. Anything still invisible? That is the defect I
> shipped, and now you have caught it before anyone else did.

---

## Video 03. Depth, and switching it off. (6 minutes)

**Cold open, the tilt card on the sales page, pointer moving.** (0:00 to 0:40)

> Last two effects, then the rule that makes all five acceptable. The card
> leans toward your pointer. Six degrees, no more. Past six it stops being a
> material and starts being a gimmick.

**Tilt.** (0:40 to 2:20)

Show `.tilt` and the pointer script.

- `perspective` on the parent, `rotateX` and `rotateY` from two custom
  properties on the card. The CSS never changes; the script only sets `--rx`
  and `--ry`.
- One `requestAnimationFrame` at a time. A `pointermove` fires far faster
  than the screen refreshes, so we take one reading per frame and drop the
  rest.
- The media queries: hover and fine pointer only, no reduced motion. A phone
  gets `transform:none !important` and the script never attaches. Say why:
  on touch there is no pointer to lean toward, so a tilting card would just
  be a card that jumps when tapped.

**Marquee.** (2:20 to 3:30)

Show `.marq`.

> The row's contents appear twice in the markup, and the animation travels
> exactly half the row's width, so the loop is seamless. It pauses on hover,
> because a reader who stops to read it should be allowed to. It is the only
> thing on the page that moves without being asked, and it is inside the
> reduced-motion query, so for some readers it does not.

**The rule.** (3:30 to 4:45)

Show the global `prefers-reduced-motion: reduce` block at the end of the CSS.

> This is the most important twelve lines in the course. For anyone who has
> asked for less motion, every animation and every transition on the page
> collapses to one millisecond. Not removed: collapsed. So every effect
> resolves to its finished state instantly. The reveals resolve to visible.
> The counters resolve to their numbers. The plate resolves to a photograph.
> The tilt resolves to a flat card. Nothing is missing, nothing moves.
>
> That is what "an honest reduced-motion branch" means. It is not a checkbox.
> It is the promise that the page with motion off is the same page.

**The render.** (4:45 to 5:30)

Pull up checklist two on screen. Name the three defects, fast: the button
that never appeared, the photo cards that rendered portrait because a
`height` attribute beat an `aspect-ratio`, the same photograph twice on one
screen. Say: none of these were in the code review, all of them were on the
screen, and the checklist exists so you look.

**Close, and the ask.** (5:30 to 6:00)

> That is the course. A plate, an arrival, a number, a tilt, a marquee, and
> the rule that switches them off. Two files, and you understand every line.
>
> One thing. When your page moves, reply to the email your link came in with
> the address. I look at every one, and I answer with the one thing I would
> change. Go make it move.

---

## After recording

1. Upload each video unlisted (YouTube or Loom). Copy the embed URL into
   `api/_lib/course.js`, field `embed`, and redeploy. Buyers' links do not
   change.
2. Send one email to everyone who bought before the videos landed: "Your
   videos are up, same link." That is the only broadcast the system sends.
3. Watch all three back once at 1.5x. Cut anything where you are explaining
   instead of showing.
