import axios from "axios";
import { API_ROOT } from "./api-config";
export interface ElementObject {
  id: string;
}
export enum ElementType {
  RACK = "racks",
  ASSET = "assets",
  MODEL = "models",
  USER = "users"
}
export interface AssetObject extends ElementObject {
  hostname: string;
  rack_position: string;
  model: ModelObjectOld;
  rack: RackObject;
  owner?: string;
  comment?: string;
}
export interface RackRangeFields {
  datacenter: string;
  letter_start: string;
  letter_end: string;
  num_start: number;
  num_end: number;
}

export interface AssetInfoObject extends ElementObject {
  hostname: string;
  rack_position: string;
  model?: string;
  rack?: string;
  owner?: string;
  comment?: string;
}

export interface UserInfoObject extends ElementObject {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateUserObject {
  password1: string;
  password2: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface RackObject extends ElementObject {
  row_letter: string;
  rack_num: string;
  height: string;
}

export interface RackResponseObject {
  rack: RackObject;
  assets: Array<AssetObject>;
}

export interface DatacenterObject extends ElementObject {
  name: string;
  abbreviation: string;
}

export interface ModificationsObject {
  existing: Array<ModelObjectOld>;
  modified: Array<ModelObjectOld>;
}

export interface ModelObjectOld extends ElementObject {
  vendor: string;
  model_number: string;
  height: string;
  display_color?: string;
  num_ethernet_ports?: string; //
  num_power_ports?: string; //
  cpu?: string;
  memory_gb?: string; //
  storage?: string;
  comment?: string;
}

export interface ModelObject extends ElementObject {
  vendor: string;
  model_number: string;
  height: string;
  display_color?: string;
  network_ports?: Array<string>; //
  num_power_ports?: string; //
  cpu?: string;
  memory_gb?: string; //
  storage?: string;
  comment?: string;
}
export interface ModelDetailObject {
  model: ModelObjectOld;
  assets: Array<AssetObject>;
}
export type ElementObjectType =
  | ModelObjectOld
  | ModelObject
  | RackObject
  | AssetObject
  | AssetInfoObject
  | UserInfoObject;

export type FormObjectType =
  | ModelObjectOld
  | RackObject
  | AssetObject
  | RackRangeFields
  | AssetInfoObject
  | UserInfoObject
  | CreateUserObject;
export function isModelObject(obj: any): obj is ModelObject {
  return obj && obj.model_number;
}
export function isRackObject(obj: any): obj is RackObject {
  return obj && obj.rack_num;
}
export function isAssetObject(obj: any): obj is AssetObject {
  return obj && obj.hostname;
}
export const getHeaders = (token: string) => {
  return {
    headers: {
      Authorization: "Token " + token
    }
  };
};

export const isAdmin = (headers: any) => {
  let isAdmin = false;
  axios
    .get(API_ROOT + "api/iamadmin", headers)
    .then(res => {
      if (res.data.is_admin) {
        isAdmin = true;
      }
    })
    .catch(err => {
      console.log(err);
    });
  return isAdmin;
};

export function getFields(type: string, headers: any) {
  return axios
    .post(
      API_ROOT + "api/" + type + "/get-many",
      { sort_by: [], filters: [] },
      headers
    )
    .then(res => {
      let items: Array<string>;
      if (type === ElementType.MODEL) {
        items = Object.keys(res.data.models[0]);
      } else {
        items = Object.keys(res.data.assets[0]);
      }
      var keys = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i] !== "id") {
          keys.push(items[i]);
        }
      }
      return keys;
    });
}
