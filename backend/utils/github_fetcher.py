"""
GitHub 代码拉取工具
从指定仓库/分支拉取一段时间内的 commits 和 patches
"""

import re
import logging
import requests
from urllib.parse import urlparse, unquote
from typing import Optional, Dict, Any, List

from backend.config import GITHUB_TOKEN

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"

# 单条 patch 最大字节数，避免单文件过大撑爆上下文
MAX_PATCH_BYTES = 100 * 1024  # 100KB


def parse_github_tree_url(github_url: str) -> Dict[str, str]:
    """
    解析 GitHub 仓库或分支链接。

    支持：
    https://github.com/owner/repo
    https://github.com/owner/repo/tree/branch
    https://github.com/owner/repo/tree/feature/xxx
    git@github.com:owner/repo.git
    """

    github_url = github_url.strip()

    # SSH 格式：git@github.com:owner/repo.git
    ssh_match = re.match(
        r"git@github\.com:(?P<owner>[^/]+)/(?P<repo>[^/]+?)(\.git)?$",
        github_url,
    )

    if ssh_match:
        return {
            "owner": ssh_match.group("owner"),
            "repo": ssh_match.group("repo"),
            "branch": "",
        }

    parsed = urlparse(github_url)

    if parsed.netloc.lower() != "github.com":
        raise ValueError("只支持 github.com 链接")

    parts = [p for p in parsed.path.strip("/").split("/") if p]

    if len(parts) < 2:
        raise ValueError("GitHub 链接格式不正确，应为 https://github.com/owner/repo")

    owner = parts[0]
    repo = parts[1].removesuffix(".git")
    branch = ""

    # /owner/repo/tree/feature/xxx
    if len(parts) >= 4 and parts[2] == "tree":
        branch = "/".join(parts[3:])
        branch = unquote(branch)

    return {
        "owner": owner,
        "repo": repo,
        "branch": branch,
    }


class GitHubPatchFetcher:
    def __init__(self, token: Optional[str] = None):
        self.token = token or GITHUB_TOKEN

        self.session = requests.Session()

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ai-team-platform",
        }

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        self.session.headers.update(headers)

    def _get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        resp = self.session.get(url, params=params, timeout=30)

        if resp.status_code == 404:
            raise RuntimeError(
                "GitHub 返回 404。可能是仓库不存在、分支不存在，或者 token 没有权限。"
            )

        if resp.status_code == 403:
            rate_remaining = resp.headers.get("x-ratelimit-remaining")
            rate_reset = resp.headers.get("x-ratelimit-reset")
            raise RuntimeError(
                f"GitHub 返回 403。可能是限流或权限不足。"
                f" remaining={rate_remaining}, reset={rate_reset}, body={resp.text[:300]}"
            )

        if resp.status_code >= 400:
            raise RuntimeError(
                f"GitHub API 请求失败：status={resp.status_code}, body={resp.text[:500]}"
            )

        return resp.json(), resp.headers

    def list_commits(
        self,
        owner: str,
        repo: str,
        branch: str,
        since: str,
        until: str,
    ) -> List[Dict[str, Any]]:
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits"

        params = {
            "sha": branch,
            "since": since,
            "until": until,
            "per_page": 100,
        }

        all_commits = []
        page = 1

        while True:
            params["page"] = page

            data, headers = self._get(url, params=params)

            if not isinstance(data, list):
                raise RuntimeError(f"GitHub commits 返回格式异常：{data}")

            all_commits.extend(data)

            link_header = headers.get("Link", "")

            if 'rel="next"' not in link_header:
                break

            page += 1

        return all_commits

    def get_commit_detail(
        self,
        owner: str,
        repo: str,
        sha: str,
    ) -> Dict[str, Any]:
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{sha}"

        data, _ = self._get(url)
        return data

    def fetch_patches(
        self,
        github_url: str,
        since: str,
        until: str,
    ) -> Dict[str, Any]:
        parsed = parse_github_tree_url(github_url)

        owner = parsed["owner"]
        repo = parsed["repo"]
        branch = parsed["branch"]

        if not branch:
            raise ValueError(
                "当前仅支持带分支名的链接，例如："
                "https://github.com/owner/repo/tree/feature/xxx"
            )

        commits = self.list_commits(
            owner=owner,
            repo=repo,
            branch=branch,
            since=since,
            until=until,
        )

        result = {
            "repo": f"{owner}/{repo}",
            "branch": branch,
            "since": since,
            "until": until,
            "commit_count": len(commits),
            "commits": [],
        }

        for commit_item in commits:
            sha = commit_item["sha"]
            detail = self.get_commit_detail(owner, repo, sha)

            commit_obj = detail.get("commit", {})
            author_obj = commit_obj.get("author", {}) or {}
            stats_obj = detail.get("stats", {}) or {}

            files = []

            for file_obj in detail.get("files", []):
                filename = file_obj.get("filename")
                patch = file_obj.get("patch")

                files.append({
                    "filename": filename,
                    "status": file_obj.get("status"),
                    "additions": file_obj.get("additions"),
                    "deletions": file_obj.get("deletions"),
                    "changes": file_obj.get("changes"),
                    "patch": patch,
                    "raw_url": file_obj.get("raw_url"),
                    "blob_url": file_obj.get("blob_url"),
                    "previous_filename": file_obj.get("previous_filename"),
                })

            result["commits"].append({
                "sha": sha,
                "short_sha": sha[:7],
                "message": commit_obj.get("message"),
                "html_url": detail.get("html_url"),
                "author_name": author_obj.get("name"),
                "author_email": author_obj.get("email"),
                "author_date": author_obj.get("date"),
                "stats": {
                    "total": stats_obj.get("total"),
                    "additions": stats_obj.get("additions"),
                    "deletions": stats_obj.get("deletions"),
                },
                "files": files,
            })

        return result

    def fetch_patches_text(self, github_url: str, since: str, until: str, max_commits: int = 20) -> str:
        """
        拉取 patches 并拼接为纯文本，截断至 MAX_PATCH_BYTES。
        返回截断后的文本，适合直接送入 LLM。
        max_commits 限制处理的 commit 数量，避免请求过多超时。
        """
        data = self.fetch_patches(github_url, since, until)
        commits = data["commits"][:max_commits]

        parts = []
        total_bytes = 0

        for commit in commits:
            for f in commit["files"]:
                patch = f.get("patch")
                if not patch:
                    continue

                header = f"\n--- {f['filename']} (+{f.get('additions', 0)} -{f.get('deletions', 0)}) ---\n"
                header_bytes = len(header.encode("utf-8"))

                if total_bytes + header_bytes >= MAX_PATCH_BYTES:
                    break

                parts.append(header)
                total_bytes += header_bytes

                remaining = MAX_PATCH_BYTES - total_bytes
                patch_bytes = patch.encode("utf-8")
                if len(patch_bytes) > remaining:
                    patch = patch_bytes[:remaining].decode("utf-8", errors="ignore")
                    parts.append(patch)
                    total_bytes = MAX_PATCH_BYTES
                    break
                else:
                    parts.append(patch)
                    total_bytes += len(patch_bytes)

            if total_bytes >= MAX_PATCH_BYTES:
                break

        return "".join(parts)
