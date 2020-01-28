interface ElementObject {
  id: string;
}
export enum ElementType {
  RACK = "racks",
  INSTANCE = "instances",
  MODEL = "models"
}
export interface InstanceObject extends ElementObject {
  hostname: string;
  elevation: number;
  model: ModelObject;
  rack: RackObject;
  owner: string;
  comment: string;
}

export interface RackObject extends ElementObject {
  row_letter: string;
  rack_num: number;
  height: number;
}

export interface ModelObject extends ElementObject {
  vendor: string;
  model_number: string;
  height: number;
  display_color: string | undefined;
  num_ethernet_ports: number | undefined;
  num_power_ports: number | undefined;
  cpu: string | undefined;
  memory_gb: number | undefined;
  storage: string | undefined;
  comment: string | undefined;
}

export interface ModelDetailObject {
  model: ModelObject;
  instances: Array<InstanceObject>;
}
export type ElementObjectType = ModelObject | RackObject | InstanceObject;
export function isModelObject(obj: any): obj is ModelObject {
  return obj && obj.model_number;
}
export function isRackObject(obj: any): obj is RackObject {
  return obj && obj.rack_num;
}
export function isInstanceObject(obj: any): obj is InstanceObject {
  return obj && obj.hostname;
}
