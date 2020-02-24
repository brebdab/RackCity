import {
  ItemPredicate,
  ItemRenderer,
  Suggest,
  Select
} from "@blueprintjs/select";
import React from "react";
import { MenuItem } from "@blueprintjs/core";
import {
  ModelObject,
  RackObject,
  DatacenterObject,
  AssetObject
} from "../utils/utils";

export enum FormTypes {
  CREATE = "create",
  MODIFY = "modify",
  DELETE = "delete"
}
export function escapeRegExpChars(text: string) {
  // eslint-disable-next-line
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
export function isMacAddressValid(text: string) {
  const regex = new RegExp(
    "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[A-Fa-f0-9]{12}$"
  );
  if (regex.exec(text)) {
    return true;
  }
  return false;
}

export const macAddressInfo = (
  <p>
    6-byte hexadecimal string. <em>Valid delimiters: none, :, - </em>
  </p>
);
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
export const filterRack: ItemPredicate<RackObject> = (
  query,
  rack,
  _index,
  exactMatch
) => {
  const rowLetter = rack.row_letter.toLowerCase();
  const rackNum = rack.rack_num;
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return rackNum === normalizedQuery || rowLetter === normalizedQuery;
  } else {
    return (rowLetter + rackNum).indexOf(normalizedQuery) >= 0;
  }
};
export const filterDatacenter: ItemPredicate<DatacenterObject> = (
  query,
  datacenter,
  _index,
  exactMatch
) => {
  const name = datacenter.name.toLowerCase();
  const abbreviation = datacenter.abbreviation.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return name === normalizedQuery || abbreviation === normalizedQuery;
  } else {
    return (abbreviation + name).indexOf(normalizedQuery) >= 0;
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
      normalizedVendor === normalizedQuery ||
      normalizedModel === normalizedQuery
    );
  } else {
    return (
      `. ${normalizedVendor} ${normalizedModel}`.indexOf(normalizedQuery) >= 0
    );
  }
};

export const filterAsset: ItemPredicate<AssetObject> = (
  query,
  asset,
  _index,
  exactMatch
) => {
  if (asset.hostname) {
    const normalizedHostname = asset.hostname.toLowerCase();

    const normalizedQuery = query.toLowerCase();

    if (exactMatch) {
      return normalizedHostname === normalizedQuery;
    } else {
      return `. ${normalizedHostname}`.indexOf(normalizedQuery) >= 0;
    }
  } else {
    return false;
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

export const renderRackItem: ItemRenderer<RackObject> = (
  rack: RackObject,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const text = rack.row_letter + rack.rack_num;
  return (
    <MenuItem
      active={modifiers.active}
      text={highlightText(text, query)}
      onClick={handleClick}
    />
  );
};

export const renderDatacenterItem: ItemRenderer<DatacenterObject> = (
  datacenter: DatacenterObject,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const text = datacenter.name;
  return (
    <MenuItem
      active={modifiers.active}
      label={datacenter.abbreviation}
      text={highlightText(text, query)}
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

export const renderAssetItem: ItemRenderer<AssetObject> = (
  asset: AssetObject,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  const text = asset.hostname;
  if (text) {
    return (
      <MenuItem
        active={modifiers.active}
        label={asset.model.vendor + " " + asset.model.model_number}
        text={highlightText(text, query)}
        onClick={handleClick}
      />
    );
  }
  return null;
};
export const renderCreateItemOption = (
  query: string,
  active: boolean,
  handleClick: React.MouseEventHandler<HTMLElement>
) => (
  <MenuItem
    icon="add"
    text={`Use "${query}"`}
    active={active}
    onClick={handleClick}
    shouldDismissPopover={false}
  />
);
export const StringSelect = Select.ofType<string>();
export const StringSuggest = Suggest.ofType<string>();
export const ModelSelect = Select.ofType<ModelObject>();
export const RackSelect = Select.ofType<RackObject>();
export const DatacenterSelect = Select.ofType<DatacenterObject>();
export const AssetSelect = Select.ofType<AssetObject>();
