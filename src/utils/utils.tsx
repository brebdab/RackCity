import axios from "axios";
import { API_ROOT } from "./api-config";
import { ITableSort, IFilter } from "../components/elementView/elementUtils";
export interface ElementObject {
  id: string;
}

export enum ROUTES {
  LOGIN = "/login",
  MODEL_DETAIL = "/dashboard/models",
  ASSET_DETAIL = "/dashboard/assets",
  DASHBOARD = "/dashboard",
  REPORT = "/dashboard/report",
  LOGS = "/dashboard/logs",
  RACK_PRINT = "/dashboard/racks/print",
  BULK_IMPORT = "/dashboard/bulk-upload/:resourceType",
  USERS = "/dashboard/users"
}
export enum ElementType {
  RACK = "racks",
  ASSET = "assets",
  MODEL = "models",
  USER = "users",
  DATACENTER = "datacenters"
}
export enum PowerSide {
  LEFT = "L",
  RIGHT = "R"
}
export interface AssetObjectOld extends ElementObject {
  hostname: string;
  rack_position: string;
  model?: ModelObject;
  rack?: RackObject;
  network_connections: {};
  owner?: string;
  comment?: string;
}

export interface AssetObject extends ParentAssetObject {
  model: ModelObject;
  rack: RackObject;
  network_graph: NetworkGraphData;
}

interface ParentAssetObject extends ElementObject {
  asset_number: string;
  hostname: string;
  rack_position: string;
  mac_addresses: { [port: string]: string };
  network_connections: Array<NetworkConnection>;
  power_connections: { [port: string]: PowerConnection };
  owner: string;
  comment: string;
}

export interface RackRangeFields {
  datacenter: string;
  letter_start: string;
  letter_end: string;
  num_start: string;
  num_end: string;
}

export interface NetworkConnection {
  source_port: string | null | undefined;
  destination_hostname: string | null | undefined;
  destination_port: string | null | undefined;
}

export const AssetFieldsTable: any = {
  asset_number: "Asset Number",
  hostname: "Hostname",
  model: "Model",
  model__vendor: "Model Vendor",
  model__model_number: "Model Number",
  rack: "Rack",
  rack__datacenter__name: "Datacenter",
  rack_position: "Rack Position",
  owner: "Owner",
  comment: "Comment"
};

export const ModelFieldsTable: any = {
  vendor: "Vendor",
  model_number: "Model Number",
  height: "Height",
  display_color: "Display Color",
  num_network_ports: "No. Network Ports",
  network_ports: "Network Ports",
  num_power_ports: "No. Power Ports",
  cpu: "CPU",
  memory_gb: "Memory (GB)",
  storage: "Storage",
  comment: "Comment"
};

export enum AssetFormLabels {
  asset_number = "Asset Number",
  hostname = "Hostname",
  datacenter = "Datacenter*",
  rack = "Rack*",
  rack_position = "Rack Position*",
  model = "Model*",
  owner = "Owner",
  comment = "Comment",
  network_ports = "Network Ports",
  power_connections = "Power Connections"
}
export interface Link {
  to: number;
  from: number;
}

export interface Node {
  id: number;
  label: string;
}
export interface NetworkGraphData {
  nodes: Array<Node>;
  links: Array<Link>;
}
export interface PowerConnection {
  left_right: PowerSide;
  port_number: string;
}
export interface ShallowAssetObject extends ParentAssetObject {
  model: string | null | undefined;
  rack: string | null | undefined;
}

export interface SortFilterBody {
  sort_by: Array<ITableSort>;
  filters: Array<IFilter>;
}

export interface PowerPortAvailability {
  left_suggest: string;
  left_available: Array<string>;
  right_suggest: string;
  right_available: Array<string>;
}
export interface UserInfoObject extends ElementObject {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
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
  datacenter: DatacenterObject;
  row_letter: string;
  rack_num: string;
  height: string;
  is_network_controlled?: boolean;
}

export interface RackResponseObject {
  rack: RackObject;
  assets: Array<AssetObjectOld>;
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
  num_network_ports?: string;
  network_ports?: Array<string>; //
  num_power_ports?: string; //
  cpu?: string;
  memory_gb?: string; //
  storage?: string;
  comment?: string;
}
export interface ModelDetailObject {
  model: ModelObjectOld;
  assets: Array<AssetObjectOld>;
}
export type ElementObjectType =
  | ModelObjectOld
  | ModelObject
  | RackObject
  | AssetObjectOld
  | AssetObject
  | ShallowAssetObject
  | UserInfoObject
  | DatacenterObject;

export type FormObjectType =
  | ModelObjectOld
  | RackObject
  | AssetObjectOld
  | AssetObject
  | DatacenterObject
  | RackRangeFields
  | ShallowAssetObject
  | UserInfoObject
  | CreateUserObject;

export function isObject(obj: any) {
  return obj === Object(obj);
}
export function isModelObject(obj: any): obj is ModelObject {
  return obj && obj.model_number;
}
export function isDatacenterObject(obj: any): obj is DatacenterObject {
  return obj && obj.abbreviation;
}
export function isRackObject(obj: any): obj is RackObject {
  return obj && obj.rack_num;
}
export function isAssetObject(obj: any): obj is AssetObject {
  return obj && obj.model;
}
export function isRackRangeFields(obj: any): obj is RackRangeFields {
  return obj && (obj.letter_start || obj.letter_start === "");
}
export function isUserObject(obj: any): obj is UserInfoObject {
  return obj && obj.username;
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
