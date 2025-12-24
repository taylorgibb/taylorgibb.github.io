---
layout: post
title: Six Rules for Pull Requests That Actually Get Merged
updated: 2025-12-24 13:58
comments: true
---

In professional software development, the code you write is only half of your job. The other half is getting that code **merged.**

We've all seen the "PR from Hell": 1,200 lines across 40 files, a mix of logic, style changes, and unrelated fixes. These PRs are where productivity goes to die. They sit in the backlog for days because they are exhausting to review, and when they finally do get merged, they are magnets for bugs.

I've developed six golden rules that transform how teams ship code. This isn't just a checklist—it's a strategy to reduce **cognitive load** for your team and increase your personal **shipping velocity.**

## 1. Do Exactly One Thing

The Single Responsibility Principle isn't just for classes; it's for Pull Requests. Every PR should solve one specific problem. When a PR does one thing, the reviewer's mental model is stable. They know exactly what logic to look for. If you mix a bug fix with a new feature, you force the reviewer to context-switch mid-file.

If you discover an unrelated bug while working on a feature, resist the urge to fix it there. Branch off, fix the bug in a 5-line PR, and keep your feature branch clean.

## 2. Keep it Small

There is a famous tweet: *"Ask a programmer to review 10 lines of code, they'll find 10 issues. Ask them to review 500 lines, they'll say 'looks good'."*

Large PRs are impossible to audit thoroughly. By keeping your changes small (ideally under 200 lines), you ensure the reviewer actually reads every line rather than skimming. A PR should be reviewable in 15 minutes or less. If it's bigger than that, you are essentially asking your teammates to spend their entire afternoon on your work.

## 3. Separate Reformatting from Logic

Mixing "Prettier" updates or linting fixes with functional code changes is the fastest way to hide bugs. When a reviewer sees 50 lines of changed indentation, their brain starts to tune out. A malicious bug or a logic error can easily hide inside a wall of whitespace changes.

Always follow the "Two-PR Policy": first PR is purely mechanical (renaming, reformatting, linting), second PR is purely functional (the actual logic change).

## 4. Prove It Works

It is not the reviewer's job to find out if your code works; it is your job to prove it to them. Every minute a reviewer spends checking if your code actually runs is a minute of wasted team time.

Every functional PR should include automated tests. If it's a bug fix, include a regression test that fails without your changes and passes with them. This creates a permanent record that the problem is solved forever.

## 5. Visual Evidence for Frontend Changes

For any UI/UX change, a description is insufficient. "Changed the button padding" means different things to different people. Front-end code is visual, and reviewing it via text-based diffs is like trying to describe a painting over the phone.

Attach a screenshot or a screen recording (Loom/GIF) to the PR. This allows the reviewer to verify the look and feel immediately. Often, a reviewer will spot a layout glitch in your screenshot that they would have missed in the code.

## 6. Own the PR Lifecycle

The PR is a conversation, not a hand-off. Your responsibility doesn't end when you hit "Create Pull Request." Code rot is real, and the longer a PR sits, the more likely it is to encounter merge conflicts.

Rebase regularly to ensure your branch is always compatible with `main`. Monitor CI and fix failures immediately—don't wait for a reviewer to tell you your tests are failing. Once you have the approvals, be the one to click merge and verify the deployment.

## The Future of Code Review: Stacked Diffs

The best developers aren't just the ones who write the smartest code; they are the ones who make it easiest for the team to move forward. By following these six rules, you reduce friction, build trust, and ensure that your code actually makes it to production.

The tooling around code reviews is evolving rapidly. [Jared Palmer's recent tweet](https://x.com/jaredpalmer/status/1999525369725215106) on the future of pull requests highlight an emerging paradigm: stacked diffs. Instead of waiting for one PR to be reviewed before starting the next, stacked diffs let you build a chain of dependent changes that can be reviewed in parallel.

Tools like [Graphite](https://graphite.dev) have been pioneering this workflow, making it possible to break large features into small, reviewable chunks without the coordination overhead. The race is heating up—Cursor recently acquired Graphite, and GitHub is adding native stacked diff support. It's clear that the industry recognizes a fundamental truth: in the AI age, where we can generate code faster than ever, we need better review tooling to keep pace.

The six rules above still apply, but the tooling is finally catching up to make them easier to follow. What is your "Golden Rule" for Pull Requests?

