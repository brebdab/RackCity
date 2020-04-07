import { ElementType } from "./utils";

export interface PermissionState {
  model_management: boolean;
  asset_management: boolean;
  power_control: boolean;
  audit_read: boolean;
  admin: boolean;
  datacenter_permissions: Array<number>;
}

export function hasAssetManagementPermission(
  elementType: ElementType,
  permissions: PermissionState
) {
  return elementType === ElementType.DATACENTER && permissions.asset_management;
}

export function hasAddElementPermission(
  elementType: ElementType,
  permissions: PermissionState
) {
  return (
    permissions.admin ||
    (elementType === ElementType.DATACENTER && permissions.asset_management) ||
    (elementType === ElementType.MODEL && permissions.model_management) ||
    (elementType === ElementType.ASSET &&
      (permissions.asset_management ||
        permissions.datacenter_permissions.length > 0)) ||
    elementType === ElementType.CHANGEPLANS
  );
}
