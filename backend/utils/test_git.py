"""
GitHub Patch 拉取测试脚本
用于手动验证 github_fetcher 模块
"""

import json
from backend.utils.github_fetcher import GitHubPatchFetcher


def print_summary(data: dict) -> None:
    print("=" * 80)
    print(f"Repo: {data['repo']}")
    print(f"Branch: {data['branch']}")
    print(f"Since: {data['since']}")
    print(f"Until: {data['until']}")
    print(f"Commit count: {data['commit_count']}")
    print("=" * 80)

    for commit in data["commits"]:
        print()
        print("-" * 80)
        print(f"Commit: {commit['short_sha']}")
        print(f"Author: {commit['author_name']} <{commit['author_email']}>")
        print(f"Date: {commit['author_date']}")
        print(f"Message: {commit['message']}")
        print(f"URL: {commit['html_url']}")
        print(
            f"Stats: +{commit['stats']['additions']} "
            f"-{commit['stats']['deletions']} "
            f"total={commit['stats']['total']}"
        )
        print("-" * 80)

        for file in commit["files"]:
            print()
            print(f"File: {file['filename']}")
            print(f"Status: {file['status']}")
            print(f"Changes: +{file['additions']} -{file['deletions']} total={file['changes']}")

            if file["patch"]:
                print("Patch:")
                print(file["patch"])
            else:
                print("Patch: <empty, binary file or too large>")


if __name__ == "__main__":
    GITHUB_URL = "https://github.com/NccChild/ai_team_together/tree/feature/niexiaolin"
    SINCE = "2026-05-01T00:00:00Z"
    UNTIL = "2026-05-20T23:59:59Z"

    fetcher = GitHubPatchFetcher()

    data = fetcher.fetch_patches(
        github_url=GITHUB_URL,
        since=SINCE,
        until=UNTIL,
    )

    print_summary(data)

    output_file = "github_patches_output_100kb.txt"

    json_text = json.dumps(data, ensure_ascii=False, indent=2)

    max_bytes = 100 * 1024

    truncated_text = (
        json_text
        .encode("utf-8")[:max_bytes]
        .decode("utf-8", errors="ignore")
    )

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(truncated_text)

    print(f"已保存前 100KB 到：{output_file}")
    print(f"原始大小：{len(json_text.encode('utf-8'))} bytes")
    print(f"截断后大小：{len(truncated_text.encode('utf-8'))} bytes")
