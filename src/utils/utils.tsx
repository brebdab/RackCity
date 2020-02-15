import axios from "axios";
import { API_ROOT } from "./api-config";
interface ElementObject {
  id: string;
}
export enum ElementType {
  RACK = "racks",
  INSTANCE = "instances",
  MODEL = "models",
  USER = "users"
}
export interface InstanceObject extends ElementObject {
  hostname: string;
  elevation: string;
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

export interface InstanceInfoObject extends ElementObject {
  hostname: string;
  elevation: string;
  model?: string;
  rack?: string;
  owner?: string;
  comment?: string;
}

export interface UserInfoObject extends ElementObject {
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface RackObject extends ElementObject {
  row_letter: string;
  rack_num: string;
  height: string;
}

export interface RackResponseObject {
  rack: RackObject;
  instances: Array<InstanceObject>;
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
  instances: Array<InstanceObject>;
}
export type ElementObjectType =
  | ModelObjectOld
  | ModelObject
  | RackObject
  | InstanceObject
  | InstanceInfoObject
  | UserInfoObject;

export type FormObjectType =
  | ModelObjectOld
  | RackObject
  | InstanceObject
  | RackRangeFields
  | InstanceInfoObject
  | UserInfoObject;
export function isModelObject(obj: any): obj is ModelObjectOld {
  return obj && obj.model_number;
}
export function isRackObject(obj: any): obj is RackObject {
  return obj && obj.rack_num;
}
export function isInstanceObject(obj: any): obj is InstanceObject {
  return obj && obj.hostname;
}
export const getHeaders = (token: string) => {
  return {
    headers: {
      Authorization: "Token " + token
    }
  };
};

export function getFields(type: string, headers: any) {
  return axios
    .post(API_ROOT + "api/" + type + "/get-many", headers)
    .then(res => {
      const items = res.data.fields;
      return items;
    });
}
