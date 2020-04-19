import { ElementType } from "./utils";

export interface PermissionState {
  model_management: boolean;
  asset_management: boolean;
  power_control: boolean;
  audit_read: boolean;
  admin: boolean;
  site_permissions: Array<number>;
}

export function hasAddElementPermission(
  elementType: ElementType,
  permissions: PermissionState
) {
  return (
    permissions.admin ||
    (elementType === ElementType.DATACENTER && permissions.asset_management) ||
    (elementType === ElementType.OFFLINE_STORAGE_SITE &&
      permissions.asset_management) ||
    (elementType === ElementType.MODEL && permissions.model_management) ||
    (elementType === ElementType.ASSET &&
      (permissions.asset_management ||
        permissions.site_permissions.length > 0)) ||
    (elementType === ElementType.CHANGEPLANS &&
      (permissions.asset_management || permissions.site_permissions.length > 0))
  );
}
