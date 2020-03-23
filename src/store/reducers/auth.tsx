import * as actionTypes from "../actions/actionTypes";
import { updateObject } from "../utility";

const initialState = {
  token: null,
  error: null,
  loading: false
};

const authStart = (state: any, action: any) => {
  return updateObject(state, {
    error: null,
    loading: true
  });
};

const authSuccess = (state: any, action: any) => {
  return updateObject(state, {
    token: action.token,
    error: null,
    loading: false
  });
};

const authFail = (state: any, action: any) => {
  return updateObject(state, {
    error: action.error,
    loading: false
  });
};

const authLogout = (state: any, action: any) => {
  return updateObject(state, {
    token: null,
    admin: null
  });
};

const authAdmin = (state: any, aciton: any) => {
  return updateObject(state, {
    admin: true
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
    default:
      return state;
  }
};

export default reducer;