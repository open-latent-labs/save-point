import React from "react";
import { IconFolder, IconFile, IconChevronRight } from "./Icons.jsx";

export default function DocTreeNode({ node, level, activeId, onSelect, expandedIds, onToggle }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeId === node.id;

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div className="gd-tree-node">
      <div
        className={"gd-tree-row" + (isActive ? " active" : "")}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={handleClick}
        title={node.label}
      >
        <span className={"gd-tree-chevron" + (isExpanded ? " open" : "")}>
          {hasChildren
            ? <IconChevronRight width="10" height="10" />
            : <span style={{ display: "block", width: 10 }} />
          }
        </span>
        <span className="gd-tree-icon">
          {node.type === "folder"
            ? <IconFolder width="14" height="14" />
            : <IconFile width="14" height="14" />
          }
        </span>
        <span className="gd-tree-label">{node.label}</span>
      </div>

      {hasChildren && (
        <div className={"gd-tree-children" + (isExpanded ? " open" : "")}>
          {node.children.map((child) => (
            <DocTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeId={activeId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
