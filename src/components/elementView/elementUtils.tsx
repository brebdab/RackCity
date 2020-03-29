import {
  RackRangeFields,
  ModelObject,
  AssetObject,
  DatacenterObject,
  UserInfoObject,
  ChangePlan,
  UserPermissionsObject
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
  DECOMMISSION = "decommission",
  GRANT_ADMIN = "grant_admin",
  REVOKE_ADMIN = "revoke_admin"
}

export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range",
  DATETIME = "datetime"
}

export enum PagingTypes {
  TEN = 10,
  FIFTY = 50,
  HUNDRED = 100,
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
  filter?: TextFilter | NumericFilter | RackRangeFields | DatetimeFilter;
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
    } else if (field === "time_decommissioned") {
      return FilterTypes.DATETIME;
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
export interface DatetimeFilter {
  after?: string;
  before?: string;
}

export const renderTextFilterItem = (item: TextFilter) => {
  return `${item.match_type} ${item.value}`;
};

export const renderNumericFilterItem = (item: NumericFilter) => {
  return `between ${item.min} - ${item.max}`;
};

export const renderRackRangeFilterItem = (item: RackRangeFields) => {
  if (item.letter_end && item.num_end) {
    return `rows  ${item.letter_start} - ${item.letter_end} & letters ${item.num_start} - ${item.num_end}`;
  } else if (item.letter_end) {
    return `rows  ${item.letter_start} - ${item.letter_end} & letters ${item.num_start}`;
  } else if (item.num_end) {
    return `row  ${item.letter_start}  & letters ${item.num_start} - ${item.num_end}`;
  } else {
    return ` ${item.letter_start}${item.num_start} `;
  }
};

export const renderDatetimeFilterItem = (item: DatetimeFilter) => {
  const after: Date | undefined = item.after ? new Date(item.after) : undefined
  const before: Date | undefined = item.before ? new Date(item.before) : undefined
  if (after && before) {
    return `from ${after.toLocaleString()} to ${before.toLocaleString()}`;
  }
  else if (after) {
    return `after ${after.toLocaleString()}`;
  } else if (before) {
    return `before ${before.toLocaleString()}`;
  }
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
export const modifyAsset = (
  asset: AssetObject,
  headers: any,
  changePlan: ChangePlan
): Promise<any> => {
  let config;
  if (!changePlan) {
    config = headers;
  } else {
    config = {
      headers: headers["headers"],
      params: {
        change_plan: changePlan.id
      }
    };
  }
  return axios.post(API_ROOT + "api/assets/modify", asset, config);
};
export const decommissionAsset = (
  asset: AssetObject,
  headers: any,
  changePlan: ChangePlan
) => {
  let config;
  if (!changePlan) {
    config = headers;
  } else {
    config = {
      headers: headers["headers"],
      params: {
        change_plan: changePlan.id
      }
    };
  }
  console.log("Decommissioning asset");
  const data = { id: asset.id };
  return axios.post(API_ROOT + "api/assets/decommission", data, config);
};

export const modifyChangePlan = (
  changePlan: ChangePlan,
  headers: any
): Promise<any> => {
  return axios.post(API_ROOT + "api/change-plans/modify", changePlan, headers);
};
export const deleteChangePlan = (
  changePlan: ChangePlan,
  headers: any
): Promise<any> => {
  return axios.post(API_ROOT + "api/change-plans/delete", changePlan, headers);
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
export const modifyUser = (
  data: UserPermissionsObject,
  headers: any
): Promise<any> => {
  return axios.post(API_ROOT + "api/users/permissions/set", data, headers);
};
