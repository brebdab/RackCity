import * as actionTypes from "../actions/actionTypes";
import { updateObject } from "../utility";
import { ChangePlan } from "../../utils/utils";
import { PermissionState } from "../../utils/permissionUtils";
interface ReduxState {
  token: string | null;
  error: string | null;
  loading: boolean;
  changePlan: ChangePlan | null;
  permissionState: PermissionState;
  isMobile: boolean;
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
    datacenter_permissions: [],
  } as PermissionState,
  isMobile: false
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
    default:
      return state;
  }
};

export default reducer;
