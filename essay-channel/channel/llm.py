"""The one place the channel talks to Claude.

Three calls: `research` (a web-searching turn that returns notes plus
the sources it read), `json` (a structured answer that validates against
a schema) and `vision_json` (the same, with images). All stream, all opt
into the server-side refusal fallback, and none returns a half answer:
a truncated or refused response is an error, never a script.
"""

import base64
import json

import anthropic

FALLBACK_BETA = "server-side-fallback-2026-07-01"
WEB_SEARCH = {"type": "web_search_20260209", "name": "web_search"}
WEB_FETCH = {"type": "web_fetch_20260209", "name": "web_fetch"}


class LLMError(Exception):
    pass


class Claude:
    def __init__(self, model="claude-opus-5-5", effort="high", client=None):
        self.model = model
        self.effort = effort
        self.client = client or anthropic.Anthropic()
        self.usage = {"input": 0, "output": 0, "calls": 0}

    def _stream(self, **kw):
        with self.client.beta.messages.stream(
                model=self.model, betas=[FALLBACK_BETA], fallbacks="default",
                **kw) as stream:
            msg = stream.get_final_message()
        u = getattr(msg, "usage", None)
        if u:
            self.usage["input"] += getattr(u, "input_tokens", 0) or 0
            self.usage["output"] += getattr(u, "output_tokens", 0) or 0
        self.usage["calls"] += 1
        return msg

    def _check(self, msg):
        if msg.stop_reason == "refusal":
            why = getattr(msg, "stop_details", None)
            raise LLMError("Claude declined this request%s" % (
                " (%s)" % why.category if why and getattr(why, "category", None)
                else ""))
        if msg.stop_reason == "max_tokens":
            raise LLMError("response was cut off at max_tokens; raise it")

    @staticmethod
    def _system(system):
        # the system prompt is the same across every pass of an episode:
        # cache it so the critique and revision reuse the prefix
        return [{"type": "text", "text": system,
                 "cache_control": {"type": "ephemeral"}}]

    # ------------------------------------------------------------ research
    def research(self, system, prompt, max_searches=12, max_tokens=32000):
        """One researching turn with web search + fetch. Returns
        (notes_text, sources) where sources is [{url, title}] in the order
        they were read; the notes cite them by URL."""
        messages = [{"role": "user", "content": prompt}]
        tools = [dict(WEB_SEARCH, max_uses=max_searches),
                 dict(WEB_FETCH, max_uses=max_searches)]
        sources, text = [], []
        for _ in range(8):            # pause_turn restarts, bounded
            msg = self._stream(max_tokens=max_tokens, system=self._system(system),
                               messages=messages, tools=tools,
                               output_config={"effort": self.effort})
            self._check(msg)
            for block in msg.content:
                t = getattr(block, "type", "")
                if t == "web_search_tool_result":
                    content = getattr(block, "content", None)
                    if isinstance(content, list):      # an error is a dict
                        for r in content:
                            if getattr(r, "type", "") == "web_search_result":
                                _add_source(sources, r.url, r.title)
                elif t == "web_fetch_tool_result":
                    content = getattr(block, "content", None)
                    url = getattr(content, "url", None)
                    if url:
                        doc = getattr(content, "content", None)
                        _add_source(sources, url, getattr(doc, "title", None))
                elif t == "text":
                    for c in getattr(block, "citations", None) or []:
                        if getattr(c, "url", None):
                            _add_source(sources, c.url, getattr(c, "title", None))
                    text.append(block.text)
            if msg.stop_reason == "pause_turn":
                messages = messages[:1] + [{"role": "assistant",
                                            "content": msg.content}]
                continue
            break
        else:
            raise LLMError("research turn never finished (pause_turn loop)")
        return "\n".join(text).strip(), sources

    # ------------------------------------------------------------ structured
    def json(self, system, prompt, schema, max_tokens=32000):
        return self._structured(system, [{"type": "text", "text": prompt}],
                                schema, max_tokens)

    def vision_json(self, system, prompt, images, schema, max_tokens=8000):
        """`images` is a list of (label, source) where source is a URL
        string or PNG/JPEG bytes. Each image is preceded by its label."""
        content = []
        for label, src in images:
            content.append({"type": "text", "text": label})
            if isinstance(src, (bytes, bytearray)):
                media = "image/png" if bytes(src[:4]) == b"\x89PNG" else "image/jpeg"
                content.append({"type": "image", "source": {
                    "type": "base64", "media_type": media,
                    "data": base64.standard_b64encode(bytes(src)).decode()}})
            else:
                content.append({"type": "image",
                                "source": {"type": "url", "url": src}})
        content.append({"type": "text", "text": prompt})
        return self._structured(system, content, schema, max_tokens)

    def _structured(self, system, content, schema, max_tokens):
        msg = self._stream(
            max_tokens=max_tokens, system=self._system(system),
            messages=[{"role": "user", "content": content}],
            output_config={"effort": self.effort,
                           "format": {"type": "json_schema", "schema": schema}})
        self._check(msg)
        text = next((b.text for b in msg.content
                     if getattr(b, "type", "") == "text"), None)
        if text is None:
            raise LLMError("no text block in a structured response")
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise LLMError("structured response was not JSON: %s" % e)


def _add_source(sources, url, title):
    if not url or any(s["url"] == url for s in sources):
        return
    sources.append({"url": url, "title": (title or url).strip()})
