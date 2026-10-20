<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accent rules live in src/lib/accent/rules.ts; every rule must cite a published source, unsourced rules are excluded — why: fairness claims must be defensible.
- Reading checks run on typed transcripts in the browser; no audio leaves the device — why: child-voice privacy rule.
- Rule stacking (two rules on one word) lives in checker.ts findRule and only uses coda-edit intermediates — why: keeps stacking narrow so it can't excuse real misreadings.
