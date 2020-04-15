import * as actionTypes from "../actions/actionTypes";
import {updateObject} from "../utility";
import {ChangePlan, TableType} from "../../utils/utils";
import {PermissionState} from "../../utils/permissionUtils";

interface ReduxState {
  token: string | null;
  error: string | null;
  loading: boolean;
  changePlan: ChangePlan | null;
  permissionState: PermissionState;
  isMobile: boolean;
  rackedAssetDataIsStale: boolean;
  storedAssetDataIsStale: boolean;
  decommissionedAssetDataIsStale: boolean;
  modelDataIsStale: boolean;
}
const initialState: ReduxState = {
  token: null,
  error: null,
  loading: false,
  changePlan: null,
  permissionState: {
    model_management: false,
    asset_management: false,
    power_control: false,
    audit_read: false,
    admin: false,
    site_permissions: [],
  } as PermissionState,
  isMobile: false,
  rackedAssetDataIsStale: false,
  storedAssetDataIsStale: false,
  decommissionedAssetDataIsStale: false,
  modelDataIsStale: false,
};
const setChangePlan = (state: any, action: any) => {
  return updateObject(state, {
    changePlan: action.changePlan,
  });
};
const updateChangePlans = (state: any, action: any) => {
  return updateObject(state, {
    updateChangePlansBoolean: action.updateChangePlansBoolean,
  });
};

const setPermissionState = (state: any, action: any) => {
  return updateObject(state, {
    permissionState: action.permissionState,
  });
};
const authStart = (state: any, action: any) => {
  return updateObject(state, {
    error: null,
    loading: true,
  });
};

const authSuccess = (state: any, action: any) => {
  return updateObject(state, {
    token: action.token,
    error: null,
    loading: false,
  });
};

const authFail = (state: any, action: any) => {
  return updateObject(state, {
    error: action.error,
    loading: false,
  });
};

const authLogout = (state: any, action: any) => {
  return updateObject(state, {
    token: null,
    admin: null,
  });
};

const authAdmin = (state: any, aciton: any) => {
  return updateObject(state, {
    admin: true,
  });
};

const setBrowser = (state: any, action: any) => {
  return updateObject(state, {
    isMobile: true,
  });
};

const markTablesStale = (state: any, action: any) => {
  return Object.assign({}, state, {
        rackedAssetDataIsStale: action.staleTables.includes(TableType.RACKED_ASSETS),
        storedAssetDataIsStale: action.staleTables.includes(TableType.STORED_ASSETS),
        decommissionedAssetDataIsStale: action.staleTables.includes(TableType.DECOMMISSIONED_ASSETS),
        modelDataIsStale: action.staleTables.includes(TableType.MODELS),
      });
};
const markTableFesh = (state: any, action: any) => {
  switch (action.freshTable) {
    case TableType.RACKED_ASSETS:
      return Object.assign({}, state, {
        rackedAssetDataIsStale: false,
      });
    case TableType.STORED_ASSETS:
      return Object.assign({}, state, {
        storedAssetDataIsStale: false,
      });
    case TableType.DECOMMISSIONED_ASSETS:
      return Object.assign({}, state, {
        decommissionedAssetDataIsStale: false,
      });
    case TableType.MODELS:
      return Object.assign({}, state, {
        modelDataIsStale: false,
      });
  }

};

// define when actions take place

const reducer = (state = initialState, action: any) => {
  switch (action.type) {
    case actionTypes.AUTH_START:
      return authStart(state, action);
    case actionTypes.AUTH_SUCCESS:
      return authSuccess(state, action);
    case actionTypes.AUTH_FAIL:
      return authFail(state, action);
    case actionTypes.AUTH_LOGOUT:
      return authLogout(state, action);
    case actionTypes.AUTH_ADMIN:
      return authAdmin(state, action);
    case actionTypes.SWITCH_CHANGE_PLAN:
      return setChangePlan(state, action);
    case actionTypes.UPDATE_CHANGE_PLANS:
      return updateChangePlans(state, action);
    case actionTypes.SET_PERMISSION_STATE:
      return setPermissionState(state, action);
    case actionTypes.SET_BROWSER_TYPE:
      return setBrowser(state, action);
    case actionTypes.MARK_TABLES_STALE:
      return markTablesStale(state, action);
    case actionTypes.MARK_TABLE_FRESH:
      return markTableFesh(state, action);
    default:
      return state;
  }
};

export default reducer;
