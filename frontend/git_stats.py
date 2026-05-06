#!/usr/bin/env python3
"""
Git statistics for the LikeAPro repo.

Run from anywhere inside the repo:
    python3 frontend/git_stats.py

Optional flags:
    --since 2026-01-01     only include commits on/after this date
    --until 2026-12-31     only include commits up to this date
    --top 10               number of rows to show in ranked tables (default 10)
"""

import argparse
import collections
import datetime as dt
import os
import subprocess
import sys


def run_git(args, cwd):
    result = subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed:\n{result.stderr.strip()}")
    return result.stdout


def find_repo_root(start):
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=start,
        capture_output=True,
        text=True,
    )
    if out.returncode != 0:
        sys.exit("Not inside a git repository.")
    return out.stdout.strip()


def date_range_args(since, until):
    args = []
    if since:
        args += ["--since", since]
    if until:
        args += ["--until", until]
    return args


def total_commits(repo, range_args):
    out = run_git(["rev-list", "--count", "HEAD", *range_args], repo).strip()
    return int(out or 0)


def commits_by_author(repo, range_args):
    out = run_git(
        ["shortlog", "-sn", "--no-merges", "HEAD", *range_args],
        repo,
    )
    rows = []
    for line in out.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        count, _, name = line.partition("\t")
        rows.append((name.strip(), int(count.strip())))
    return rows


def lines_by_author(repo, range_args):
    """Returns dict: name -> (added, removed, files_touched)."""
    out = run_git(
        [
            "log",
            "--no-merges",
            "--numstat",
            "--format=__COMMIT__%aN",
            *range_args,
        ],
        repo,
    )

    stats = collections.defaultdict(lambda: [0, 0, set()])  # added, removed, files
    current = None

    for line in out.splitlines():
        if line.startswith("__COMMIT__"):
            current = line[len("__COMMIT__"):].strip()
            continue
        if not line.strip() or current is None:
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        added, removed, path = parts
        if added == "-" or removed == "-":
            continue  # binary file
        stats[current][0] += int(added)
        stats[current][1] += int(removed)
        stats[current][2].add(path)

    return {
        name: {"added": a, "removed": r, "files": len(f)}
        for name, (a, r, f) in stats.items()
    }


def commits_by_day_of_week(repo, range_args):
    out = run_git(
        ["log", "--no-merges", "--format=%ai", *range_args],
        repo,
    )
    counts = collections.Counter()
    for line in out.splitlines():
        try:
            d = dt.datetime.strptime(line.strip()[:10], "%Y-%m-%d")
        except ValueError:
            continue
        counts[d.strftime("%A")] += 1
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return [(day, counts.get(day, 0)) for day in order]


def commits_by_hour(repo, range_args):
    out = run_git(
        ["log", "--no-merges", "--format=%aI", *range_args],
        repo,
    )
    counts = collections.Counter()
    for line in out.splitlines():
        try:
            d = dt.datetime.fromisoformat(line.strip())
        except ValueError:
            continue
        counts[d.hour] += 1
    return [(h, counts.get(h, 0)) for h in range(24)]


def most_modified_files(repo, range_args, limit):
    out = run_git(
        ["log", "--no-merges", "--name-only", "--format=", *range_args],
        repo,
    )
    counts = collections.Counter()
    for line in out.splitlines():
        path = line.strip()
        if path:
            counts[path] += 1
    return counts.most_common(limit)


def first_last_commit(repo, range_args):
    first = run_git(
        ["log", "--no-merges", "--reverse", "--format=%ai", *range_args],
        repo,
    ).splitlines()
    last = run_git(
        ["log", "--no-merges", "--format=%ai", *range_args],
        repo,
    ).splitlines()
    return (
        first[0].strip() if first else None,
        last[0].strip() if last else None,
    )


# ---------- formatting helpers ----------

def fmt_table(headers, rows, aligns=None):
    cols = list(zip(headers, *rows)) if rows else [(h,) for h in headers]
    widths = [max(len(str(c)) for c in col) for col in cols]
    aligns = aligns or [">" if i > 0 else "<" for i in range(len(headers))]

    def fmt_row(row):
        return "  ".join(
            f"{str(cell):{aligns[i]}{widths[i]}}" for i, cell in enumerate(row)
        )

    lines = [fmt_row(headers), "  ".join("-" * w for w in widths)]
    for row in rows:
        lines.append(fmt_row(row))
    return "\n".join(lines)


def bar(value, max_value, width=24):
    if not max_value:
        return ""
    filled = round(width * value / max_value)
    return "█" * filled + "·" * (width - filled)


def section(title):
    print()
    print(title)
    print("=" * len(title))


# ---------- main ----------

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since", help="YYYY-MM-DD")
    parser.add_argument("--until", help="YYYY-MM-DD")
    parser.add_argument("--top", type=int, default=10, help="rows in ranked tables")
    args = parser.parse_args()

    repo = find_repo_root(os.getcwd())
    range_args = date_range_args(args.since, args.until)

    total = total_commits(repo, range_args)
    first, last = first_last_commit(repo, range_args)

    print(f"Repository: {repo}")
    if args.since or args.until:
        print(f"Range:      {args.since or 'beginning'}  →  {args.until or 'now'}")
    print(f"Commits:    {total}")
    if first and last:
        print(f"First:      {first}")
        print(f"Latest:     {last}")

    # ---------- commits + lines per author ----------
    section("Authors")
    commit_rows = commits_by_author(repo, range_args)
    line_rows = lines_by_author(repo, range_args)

    rows = []
    for name, count in commit_rows[: args.top]:
        ls = line_rows.get(name, {"added": 0, "removed": 0, "files": 0})
        rows.append([
            name,
            count,
            f"+{ls['added']}",
            f"-{ls['removed']}",
            ls["files"],
        ])
    print(fmt_table(
        ["Author", "Commits", "Added", "Removed", "Files"],
        rows,
        aligns=["<", ">", ">", ">", ">"],
    ))

    # ---------- day of week ----------
    section("Activity by day of week")
    dow = commits_by_day_of_week(repo, range_args)
    max_v = max((v for _, v in dow), default=0)
    for day, count in dow:
        print(f"{day:<10} {count:>4}  {bar(count, max_v)}")

    # ---------- hour of day ----------
    section("Activity by hour of day")
    hours = commits_by_hour(repo, range_args)
    max_v = max((v for _, v in hours), default=0)
    for h, count in hours:
        print(f"{h:02d}:00      {count:>4}  {bar(count, max_v)}")

    # ---------- hottest files ----------
    section(f"Most modified files (top {args.top})")
    files = most_modified_files(repo, range_args, args.top)
    rows = [[path, count] for path, count in files]
    print(fmt_table(["File", "Touches"], rows, aligns=["<", ">"]))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
