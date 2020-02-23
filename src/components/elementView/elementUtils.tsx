import {
  RackRangeFields,
  ModelObject,
  AssetObject,
  DatacenterObject,
  UserInfoObject
} from "../../utils/utils";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
export interface ITableSort {
  field: string;
  ascending: boolean;
  id: string;
}

export enum ElementTableOpenAlert {
  NONE = "none",
  DELETE = "delete",
  GRANT_ADMIN = "grant_admin",
  REVOKE_ADMIN = "revoke_admin"
}

export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range"
}

export enum PagingTypes {
  TEN = 10,
  FIFTY = 50,
  ALL = "View All"
}
export enum TextFilterTypes {
  EXACT = "exact",
  CONTAINS = "contains"
}

export interface IFilter {
  id: string;
  field: string;
  filter_type?: FilterTypes;
  filter?: TextFilter | NumericFilter | RackRangeFields;
}
const numberFields = [
  "rack_position",
  "height",
  "num_ethernet_ports",
  "num_power_ports",
  "memory_gb",
  "num_network_ports"
];

export function getFilterType(field: string | undefined) {
  if (field) {
    if (field === "rack") {
      return FilterTypes.RACKRANGE;
    } else if (numberFields.includes(field)) {
      return FilterTypes.NUMERIC;
    }
    return FilterTypes.TEXT;
  }
}

export interface NumericFilter {
  min?: number;
  max?: number;
}
export interface TextFilter {
  value?: string;
  match_type: string;
}

export const renderTextFilterItem = (item: TextFilter) => {
  return `${item.match_type} ${item.value}`;
};

export const renderNumericFilterItem = (item: NumericFilter) => {
  return `between ${item.min} - ${item.max}`;
};
export const renderRackRangeFilterItem = (item: RackRangeFields) => {
  return `rows  ${item.letter_start} - ${item.letter_end} & racks ${item.num_start} - ${item.num_end}`;
};

export const modifyModel = (model: ModelObject, headers: any) => {
  return axios.post(API_ROOT + "api/models/modify", model, headers);
};
export const deleteModel = (model: ModelObject, headers: any) => {
  const data = { id: model!.id };
  return axios.post(API_ROOT + "api/models/delete", data, headers);
};
export const deleteAsset = (asset: AssetObject, headers: any) => {
  console.log("Deleting asset");
  const data = { id: asset.id };
  return axios.post(API_ROOT + "api/assets/delete", data, headers);
};
export const modifyAsset = (asset: AssetObject, headers: any): Promise<any> => {
  return axios.post(API_ROOT + "api/assets/modify", asset, headers);
};

export const deleteDatacenter = (
  dc: DatacenterObject,
  headers: any
): Promise<any> => {
  const data = { id: dc.id };
  return axios.post(API_ROOT + "api/datacenters/delete", data, headers);
};

export const modifyDatacenter = (
  dc: DatacenterObject,
  headers: any
): Promise<any> => {
  return axios.post(API_ROOT + "api/datacenters/modify", dc, headers);
};
export const deleteUser = (
  user: UserInfoObject,
  headers: any
): Promise<any> => {
  const data = { id: user.id };
  return axios.post(API_ROOT + "api/users/delete", data, headers);
};
