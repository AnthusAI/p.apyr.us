"""One-time data migration: give each published p.apyr.us article front matter in the CMS.

The standard front end reads title, description, author and date from an item's front matter, not from the legacy
deck/byline columns. This saves and publishes each article again with front matter derived from those columns (the
columns themselves are kept, so the Amplify reader still renders), and adds the old /articles/<slug> address as an alias.

    PAPYRUS_GRAPHQL_AUTH=iam PAPYRUS_GRAPHQL_ENDPOINT=... python bin/front_matter_migration.py [--apply]
"""
from __future__ import annotations

import sys

import yaml

from papyrus_content.publishing import ItemFields, publish_item, save_item


def front_matter_for(item: dict) -> str:
    data = {"title": item["title"]}
    if item.get("deck"):
        data["description"] = item["deck"]
    if item.get("byline"):
        data["author"] = item["byline"]
    data["date"] = (item.get("publishedAt") or "")[:10]
    return yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=10_000)


def migrate(client, *, apply: bool, actor: str = "front-matter-migration") -> list[str]:
    done = []
    for item in sorted(client.list_records("Item"), key=lambda row: row["slug"]):
        if item.get("type") != "article" or item.get("status") != "published":
            continue
        aliases = sorted({*(item.get("aliases") or []), f"/articles/{item['slug']}"})
        fields = ItemFields(type=item["type"], slug=item["slug"], section=item.get("section"),
                            front_matter_yaml=front_matter_for(item), body_markus=item.get("bodyMarkus") or "",
                            aliases=aliases, id=item["id"])
        done.append(item["slug"])
        if apply:
            save_item(client, fields, actor=actor)
            publish_item(client, item["id"], actor=actor)
    return done


if __name__ == "__main__":
    from papyrus_content.graphql_authoring import create_authoring_client

    client, _claims = create_authoring_client(None)
    slugs = migrate(client, apply="--apply" in sys.argv)
    print(("migrated" if "--apply" in sys.argv else "would migrate"), len(slugs), "articles")
