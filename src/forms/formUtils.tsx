import { ItemPredicate, ItemRenderer, Suggest } from "@blueprintjs/select";
import React from "react";
import { MenuItem } from "@blueprintjs/core";
import { ModelObject } from "../components/utils";

export function escapeRegExpChars(text: string) {
  // eslint-disable-next-line
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
export const filterString: ItemPredicate<string> = (
  query,
  vendor,
  _index,
  exactMatch
) => {
  const normalizedTitle = vendor.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return normalizedTitle.indexOf(normalizedQuery) >= 0;
  }
};

export const filterModel: ItemPredicate<ModelObject> = (
  query,
  model,
  _index,
  exactMatch
) => {
  const normalizedVendor = model.vendor.toLowerCase();
  const normalizedModel = model.model_number.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return (
      normalizedVendor === normalizedQuery || normalizedModel == normalizedQuery
    );
  } else {
    return (
      `. ${normalizedVendor} ${normalizedModel}`.indexOf(normalizedQuery) >= 0
    );
  }
};

function highlightText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }

  const regexp = new RegExp(words.join("|"), "gi");
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}
export const renderStringItem: ItemRenderer<string> = (
  vendor,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      active={modifiers.active}
      text={highlightText(vendor, query)}
      onClick={handleClick}
    />
  );
};

export const renderModelItem: ItemRenderer<ModelObject> = (
  model: ModelObject,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const text = model.vendor;
  return (
    <MenuItem
      active={modifiers.active}
      label={model.model_number}
      text={highlightText(text, query)}
      onClick={handleClick}
    />
  );
};
export const renderCreateItemOption = (
  query: string,
  active: boolean,
  handleClick: React.MouseEventHandler<HTMLElement>
) => (
  <MenuItem
    icon="add"
    text={`Use"${query}"`}
    active={active}
    onClick={handleClick}
    shouldDismissPopover={false}
  />
);

export const StringSuggest = Suggest.ofType<string>();
export const ModelSuggest = Suggest.ofType<ModelObject>();
